// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var import_express2 = __toESM(require_express2(), 1);
var EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
var DUMMY_HASH = await hashPassword("contrase\xF1a-de-referencia");
function attemptLimiter(max = 10) {
  const attempts2 = /* @__PURE__ */ new Map();
  let sweep = 0;
  return (key) => {
    const now3 = Date.now();
    if (attempts2.size > 5e3 && now3 - sweep > 6e4) {
      sweep = now3;
      for (const [k, v] of attempts2) if (v.until < now3) attempts2.delete(k);
    }
    const entry = attempts2.get(key);
    if (!entry || entry.until < now3) {
      attempts2.set(key, { count: 1, until: now3 + 15 * 6e4 });
      return;
    }
    entry.count++;
    if (entry.count > max)
      throw new HttpError(429, "Demasiados intentos. Espera unos minutos e int\xE9ntalo de nuevo.");
  };
}
function authRoutes(db2, secureCookies, mailbox, registrationLimit = 60, linkLimit = 10, sms, loginIpLimit = 50) {
  const router = (0, import_express2.Router)();
  const limit = attemptLimiter();
  const limitAccount = attemptLimiter(20);
  const limitLoginIp = attemptLimiter(loginIpLimit);
  const limitRegistration = attemptLimiter(registrationLimit);
  const limitMail = attemptLimiter(linkLimit);
  const limitConfirm = attemptLimiter(linkLimit);
  const CODE_MINUTES = 10;
  const limitSms = attemptLimiter(5);
  async function sendCode(user, phone) {
    if (!sms)
      throw new HttpError(
        503,
        "La confirmaci\xF3n por mensaje de texto todav\xEDa no est\xE1 activa. Elige confirmar por correo."
      );
    const last = await db2.prepare("SELECT sent_at FROM sms_codes WHERE user_id=?").get(user.id);
    if (last && Date.now() - Date.parse(last.sent_at) < 6e4)
      throw new HttpError(429, "Espera un minuto antes de pedir otro c\xF3digo.");
    limitSms(`sms|${user.id}`);
    const code = newCode();
    const now3 = /* @__PURE__ */ new Date();
    await db2.prepare("DELETE FROM sms_codes WHERE user_id=?").run(user.id);
    await db2.prepare(
      "INSERT INTO sms_codes (user_id, phone, code_hash, expires_at, attempts, sent_at) VALUES (?,?,?,?,0,?)"
    ).run(
      user.id,
      phone,
      hashCode(user.id, code),
      new Date(now3.getTime() + CODE_MINUTES * 6e4).toISOString(),
      now3.toISOString()
    );
    try {
      await sms.send(
        phone,
        `SucreIA: tu codigo para confirmar la cuenta es ${code}. Vence en ${CODE_MINUTES} minutos. No lo compartas.`
      );
    } catch {
      await db2.prepare("DELETE FROM sms_codes WHERE user_id=?").run(user.id);
      throw new HttpError(
        502,
        "No pudimos enviar el mensaje de texto. Revisa el n\xFAmero o confirma por correo."
      );
    }
  }
  async function send(user, purpose) {
    if (!mailbox) throw new HttpError(503, "El env\xEDo de correos todav\xEDa no est\xE1 configurado.");
    const { token, expiresAt } = await issueToken(db2, user.id, purpose);
    await mailbox.send(user.email, purpose, token, expiresAt);
  }
  router.post("/recuperar", async (req, res) => {
    const email = text(req.body, "email", 254, "el correo").toLowerCase();
    if (!EMAIL.test(email)) throw new HttpError(400, "Escribe un correo v\xE1lido.");
    limitMail(`reset|${req.ip}`);
    if (!mailbox) throw new HttpError(503, "El env\xEDo de correos todav\xEDa no est\xE1 configurado.");
    const found = await findUserByEmail(db2, email);
    if (found) {
      try {
        await send(found, "reset");
      } catch {
        console.warn("No se pudo entregar un correo de recuperaci\xF3n.");
      }
    }
    res.json({
      message: "Si existe una cuenta con ese correo, recibir\xE1s un enlace para recuperar tu contrase\xF1a."
    });
  });
  router.post("/restablecer", async (req, res) => {
    limitConfirm(`reset|${req.ip}`);
    const token = text(req.body, "token", 128, "el enlace");
    const password = text(req.body, "password", 200, "la contrase\xF1a");
    if (password.length < 8)
      throw new HttpError(400, "La contrase\xF1a debe tener al menos 8 caracteres.");
    const passwordHash = await hashPassword(password);
    await db2.transaction(async (tx) => {
      const userId = await consumeToken(tx, token, "reset");
      await tx.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
      await tx.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    });
    res.json({ message: "Contrase\xF1a actualizada. Inicia sesi\xF3n con tu nueva contrase\xF1a." });
  });
  router.post("/solicitar-verificacion", async (req, res) => {
    const user = requireUser(res);
    limitMail(`verify|${user.id}`);
    if (!user.emailVerifiedAt) await send(user, "verify");
    res.json({
      message: user.emailVerifiedAt ? "Tu correo ya est\xE1 verificado." : "Te enviamos un enlace para verificar tu correo."
    });
  });
  router.post("/verificar-correo", async (req, res) => {
    limitConfirm(`verify|${req.ip}`);
    const token = text(req.body, "token", 128, "el enlace");
    const userId = await db2.transaction(async (tx) => {
      const id = await consumeToken(tx, token, "verify");
      await tx.prepare("UPDATE users SET emailVerifiedAt = ? WHERE id = ?").run((/* @__PURE__ */ new Date()).toISOString(), id);
      return id;
    });
    const user = await findUserById(db2, userId);
    res.json({ message: "Tu correo qued\xF3 confirmado.", email: user?.email ?? "" });
  });
  router.get("/sms/estado", (_req, res) => res.json({ enabled: !!sms }));
  router.post("/verificar-sms", async (req, res) => {
    const user = requireUser(res);
    limitConfirm(`sms-check|${user.id}`);
    const code = text(req.body, "code", 12, "el c\xF3digo").replace(/\D/g, "");
    const row = await db2.prepare("SELECT code_hash, expires_at, attempts FROM sms_codes WHERE user_id=?").get(user.id);
    if (!row || Date.parse(row.expires_at) < Date.now())
      throw new HttpError(410, "El c\xF3digo venci\xF3. Pide uno nuevo.");
    if (row.attempts >= 5) throw new HttpError(429, "Demasiados intentos. Pide un c\xF3digo nuevo.");
    if (row.code_hash !== hashCode(user.id, code)) {
      await db2.prepare("UPDATE sms_codes SET attempts = attempts + 1 WHERE user_id=?").run(user.id);
      throw new HttpError(400, "El c\xF3digo no es correcto.");
    }
    await db2.transaction(async (tx) => {
      await tx.prepare("UPDATE users SET emailVerifiedAt = COALESCE(emailVerifiedAt, ?) WHERE id = ?").run((/* @__PURE__ */ new Date()).toISOString(), user.id);
      await tx.prepare("DELETE FROM sms_codes WHERE user_id=?").run(user.id);
    });
    res.json({ message: "Tu cuenta qued\xF3 confirmada.", email: user.email });
  });
  router.post("/verificacion", async (req, res) => {
    const user = requireUser(res);
    if (user.emailVerifiedAt) {
      res.json({ message: "Tu cuenta ya est\xE1 confirmada." });
      return;
    }
    const channel = req.body?.channel === "sms" ? "sms" : "email";
    if (channel === "sms") {
      const phone = colombianMobile(req.body?.phone) ?? user.phone;
      if (!phone) throw new HttpError(400, "Escribe un celular colombiano de 10 d\xEDgitos.");
      await sendCode(user, phone);
      await db2.prepare("UPDATE users SET verify_channel='sms', phone=? WHERE id=?").run(phone, user.id);
      res.json({ message: `Te enviamos un c\xF3digo al ${maskPhone(phone)}.` });
      return;
    }
    limitMail(`verify|${user.id}`);
    await db2.prepare("UPDATE users SET verify_channel='email' WHERE id=?").run(user.id);
    await send(user, "verify");
    res.json({ message: "Te enviamos un enlace para confirmar tu correo." });
  });
  router.post("/registro", async (req, res) => {
    limitRegistration(req.ip ?? "unknown");
    const email = text(req.body, "email", 254, "el correo").toLowerCase();
    const password = text(req.body, "password", 200, "la contrase\xF1a");
    const role = req.body?.role === "emprendedor" ? "emprendedor" : "cliente";
    if (!EMAIL.test(email)) throw new HttpError(400, "Escribe un correo v\xE1lido.");
    if (password.length < 8)
      throw new HttpError(400, "La contrase\xF1a debe tener al menos 8 caracteres.");
    const optional = (key, max) => typeof req.body?.[key] === "string" ? req.body[key].trim().slice(0, max) : "";
    const name = optional("name", 80);
    const documentNumber = optional("documentNumber", 12);
    const address = optional("address", 180);
    if (documentNumber && !/^\d{5,12}$/.test(documentNumber))
      throw new HttpError(400, "Escribe la c\xE9dula sin puntos ni espacios.");
    const viaSms = req.body?.verifyBy === "sms";
    const phone = viaSms ? colombianMobile(req.body?.phone) : null;
    if (viaSms && !phone) throw new HttpError(400, "Escribe un celular colombiano de 10 d\xEDgitos.");
    if (viaSms && !sms)
      throw new HttpError(
        503,
        "La confirmaci\xF3n por mensaje de texto todav\xEDa no est\xE1 activa. Elige confirmar por correo."
      );
    if (await findUserByEmail(db2, email))
      throw new HttpError(409, "Ya existe una cuenta con ese correo.");
    const user = await createUser(db2, {
      verifyChannel: viaSms ? "sms" : "email",
      phone,
      email,
      name,
      role,
      documentNumber: documentNumber || void 0,
      address: address || void 0,
      passwordHash: await hashPassword(password)
    });
    await registerReferral(db2, user.id, req.body?.referido);
    let verificationSent = false;
    if (phone) {
      try {
        await sendCode(user, phone);
        verificationSent = true;
      } catch {
        console.warn("No se pudo enviar el c\xF3digo por SMS.");
      }
    } else if (mailbox) {
      try {
        await send(user, "verify");
        verificationSent = true;
      } catch {
        console.warn("No se pudo entregar un correo de verificaci\xF3n.");
      }
    }
    const session = await createSession(db2, user.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    res.status(201).json({ user, verificationSent });
  });
  router.post("/ingresar", async (req, res) => {
    const email = text(req.body, "email", 254, "el correo").toLowerCase();
    const password = text(req.body, "password", 200, "la contrase\xF1a");
    limitAccount(`cuenta|${email}`);
    limitLoginIp(`ip|${req.ip}`);
    limit(`${req.ip}|${email}`);
    const found = await findUserByEmail(db2, email);
    const ok = await verifyPassword(password, found?.password_hash ?? DUMMY_HASH);
    if (!found || !ok) throw new HttpError(401, "Correo o contrase\xF1a incorrectos.");
    const session = await createSession(db2, found.id);
    setSessionCookie(res, session.token, session.expires, secureCookies);
    const { password_hash: _hash, ...user } = found;
    res.json({ user });
  });
  router.post("/emprender", async (req, res) => {
    const user = requireUser(res);
    if (user.role === "cliente" && req.body?.aceptoDejarDeSerCliente !== true)
      throw new HttpError(
        400,
        "Acepta que al pasar a emprendedor tu cuenta deja de ser de cliente y no podr\xE1s volver."
      );
    await db2.prepare("UPDATE users SET role='emprendedor' WHERE id=? AND role='cliente'").run(user.id);
    res.status(204).end();
  });
  router.put("/perfil/datos", async (req, res) => {
    const user = requireUser(res);
    if (!user.emailVerifiedAt) throw new HttpError(403, "Primero confirma tu correo.");
    const name = text(req.body, "name", 80, "tu nombre completo");
    const documentNumber = text(req.body, "documentNumber", 12, "el n\xFAmero de c\xE9dula");
    if (!/^\d{5,12}$/.test(documentNumber))
      throw new HttpError(400, "Escribe la c\xE9dula sin puntos ni espacios.");
    const address = text(req.body, "address", 180, "la direcci\xF3n");
    await db2.prepare(
      "UPDATE users SET name=?, document_number=?, home_address=?, profile_completed_at=COALESCE(profile_completed_at, ?) WHERE id=?"
    ).run(name, documentNumber, address, (/* @__PURE__ */ new Date()).toISOString(), user.id);
    res.json({ user: await findUserById(db2, user.id) });
  });
  router.put("/perfil", async (req, res) => {
    const user = requireUser(res);
    const name = text(req.body, "name", 80, "tu nombre");
    await db2.prepare("UPDATE users SET name=? WHERE id=?").run(name, user.id);
    res.status(204).end();
  });
  router.post("/salir", async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await deleteSession(db2, token);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.status(204).end();
  });
  router.get("/yo", (_req, res) => {
    res.json({ user: currentUser(res) ?? null });
  });
  return router;
}
