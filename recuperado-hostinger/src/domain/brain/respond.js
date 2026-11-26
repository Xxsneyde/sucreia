// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
var PAGE = 4;
var productHref = (storeId, productId) => `${businessHref(storeId)}&producto=${encodeURIComponent(productId)}`;
var pesos = (n) => currency(n);
var pick = (list, seed) => list[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % list.length];
var km = (a, b) => {
  const r = (d) => d * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
var quality = (s) => ((s.rating ?? 0) * s.reviewCount + 4 * 3) / (s.reviewCount + 3);
var productQuality = (p) => ((p.rating ?? 0) * p.ratingCount + 4 * 2) / (p.ratingCount + 2);
function merge(prev, next) {
  return {
    ...prev,
    terms: next.terms.length ? next.terms : prev.terms,
    town: next.town || (next.region ? "" : prev.town),
    region: next.region || (next.town ? "" : prev.region),
    sector: next.sector || prev.sector,
    subcategory: next.subcategory || prev.subcategory,
    mode: next.mode || prev.mode,
    delivery: next.delivery || prev.delivery,
    maxPrice: next.maxPrice || (next.sort === "expensive" ? 0 : prev.maxPrice),
    minPrice: next.minPrice || prev.minPrice,
    people: next.people || prev.people,
    openNow: next.openNow || prev.openNow,
    day: next.day >= 0 ? next.day : prev.day,
    sort: next.sort !== "relevance" ? next.sort : prev.sort,
    promo: next.promo || prev.promo,
    verified: next.verified || prev.verified,
    near: next.near || prev.near
  };
}
function productsFor(s, q) {
  return s.products.filter(
    (p) => (!q.maxPrice || p.price > 0 && p.price <= q.maxPrice) && (!q.minPrice || p.price >= q.minPrice) && // Con «para N personas» solo cuentan los productos que dicen para cuántos rinden.
    (!q.people || p.serves !== null && p.serves >= q.people)
  );
}
function candidates(k, q, opts) {
  const now3 = opts.now ?? /* @__PURE__ */ new Date();
  const hits = q.terms.length ? search(k, q.terms) : null;
  const out = [];
  k.stores.forEach((s, i) => {
    if (q.town && s.municipality !== q.town) return;
    if (q.region && s.region !== q.region) return;
    const sameSub = !!q.subcategory && plain(s.subcategory) === plain(q.subcategory);
    if (!q.terms.length) {
      if (q.subcategory && !sameSub) return;
      if (q.sector && !q.subcategory && s.category !== q.sector) return;
    }
    if (q.mode && s.mode !== q.mode) return;
    if (q.delivery && !s.delivery) return;
    if (q.promo && !s.discount) return;
    if (q.verified && !s.verified) return;
    const open = openAt(s.week, now3);
    if (q.openNow && open === false) return;
    if (q.day >= 0 && opensOn(s.week, q.day) === false) return;
    const hit = hits?.get(i);
    if (hits && !hit) return;
    const allowed = productsFor(s, q);
    if ((q.maxPrice || q.minPrice || q.people) && !allowed.length) return;
    let product = null;
    if (q.terms.length && hit) {
      const topProduct = Math.max(0, ...hit.products.values());
      const ranked = allowed.map((p) => ({ p, v: hit.products.get(s.products.indexOf(p)) ?? 0 })).filter((x) => x.v > 0 && x.v >= topProduct * 0.5).sort((a, b) => b.v - a.v || (q.sort === "cheap" ? a.p.price - b.p.price : 0));
      product = ranked[0]?.p ?? (hit.product === -1 && allowed.length && !q.maxPrice && !q.people ? best(allowed, q) : null);
      if (!product && (q.maxPrice || q.minPrice || q.people)) return;
    } else if (allowed.length) {
      product = best(allowed, q);
    }
    const distance = opts.location && s.lat !== null && s.lng !== null ? km(opts.location, { lat: s.lat, lng: s.lng }) : null;
    let score = hit ? hit.score : 1;
    score *= 0.85 + quality(s) / 20;
    if (product?.ratingCount) score *= 0.9 + productQuality(product) / 25;
    if (sameSub) score *= 1.3;
    if (open) score *= 1.08;
    if (s.verified) score *= 1.04;
    if (q.people && product?.serves && product.serves >= q.people) score *= 1.15;
    out.push({ store: s, product, score, distance, open });
  });
  if (q.terms.length && out.length) {
    const top = Math.max(...out.map((c) => c.score));
    for (let i = out.length - 1; i >= 0; i--) if (out[i].score < top * 0.35) out.splice(i, 1);
  }
  const price = (c) => c.product?.price || Infinity;
  out.sort((a, b) => {
    if (q.sort === "cheap") return price(a) - price(b) || b.score - a.score;
    if (q.sort === "expensive") return (b.product?.price ?? 0) - (a.product?.price ?? 0);
    if (q.sort === "best") return quality(b.store) - quality(a.store) || b.score - a.score;
    if (q.sort === "near" && a.distance !== null && b.distance !== null)
      return a.distance - b.distance;
    return b.score - a.score;
  });
  return out;
}
function best(list, q) {
  return q.sort === "cheap" ? [...list].filter((p) => p.price > 0).sort((a, b) => a.price - b.price)[0] ?? list[0] : [...list].sort((a, b) => productQuality(b) - productQuality(a))[0];
}
var relaxers = [
  {
    when: (q) => q.openNow,
    relax: (q) => ({ ...q, openNow: false }),
    say: () => "abierto en este momento"
  },
  {
    when: (q) => q.day >= 0,
    relax: (q) => ({ ...q, day: -1 }),
    say: (q) => `que abra el ${dayLabel[q.day]}`
  },
  { when: (q) => q.promo, relax: (q) => ({ ...q, promo: false }), say: () => "con promoci\xF3n" },
  {
    when: (q) => q.delivery,
    relax: (q) => ({ ...q, delivery: false }),
    say: () => "con domicilio"
  },
  { when: (q) => q.verified, relax: (q) => ({ ...q, verified: false }), say: () => "verificado" },
  { when: (q) => !!q.town, relax: (q) => ({ ...q, town: "" }), say: (q) => `en ${q.town}` },
  { when: (q) => !!q.region, relax: (q) => ({ ...q, region: "" }), say: (q) => `en ${q.region}` },
  {
    when: (q) => q.maxPrice > 0,
    relax: (q) => ({ ...q, maxPrice: 0 }),
    say: (q) => `de menos de ${pesos(q.maxPrice)}`
  },
  {
    when: (q) => q.people > 0,
    relax: (q) => ({ ...q, people: 0 }),
    say: (q) => `para ${q.people} personas`
  },
  {
    when: (q) => q.mode !== "",
    relax: (q) => ({ ...q, mode: "" }),
    say: () => "con esa modalidad"
  }
];
function describeQuery(q) {
  const parts = [];
  if (q.subcategory) parts.push(`de ${q.subcategory.toLowerCase()}`);
  else if (q.sector && !q.terms.length) parts.push(`de ${q.sector.toLowerCase()}`);
  if (q.people) parts.push(`para ${q.people} personas`);
  if (q.maxPrice && q.minPrice) parts.push(`entre ${pesos(q.minPrice)} y ${pesos(q.maxPrice)}`);
  else if (q.maxPrice) parts.push(`de hasta ${pesos(q.maxPrice)}`);
  else if (q.minPrice) parts.push(`desde ${pesos(q.minPrice)}`);
  if (q.town) parts.push(`en ${q.town}`);
  else if (q.region) parts.push(`en ${q.region}`);
  if (q.delivery) parts.push("con domicilio");
  if (q.openNow) parts.push("abiertos ahora");
  if (q.day >= 0) parts.push(`que abren el ${dayLabel[q.day]}`);
  if (q.promo) parts.push("con promoci\xF3n");
  if (q.verified) parts.push("verificados");
  return parts.join(" ");
}
function why(c, q) {
  const bits = [];
  const p = c.product;
  if (p) {
    bits.push(p.price > 0 ? `${p.name} \xB7 ${pesos(p.price)}` : `${p.name} \xB7 a cotizar`);
    if (p.serves && (q.people || /porci|persona/.test(plain(p.name)) === false))
      bits.push(`rinde ${p.serves}`);
    if (p.ratingCount) bits.push(`\u2605 ${p.rating.toFixed(1)} el producto`);
  }
  if (c.store.reviewCount) bits.push(`\u2605 ${c.store.rating.toFixed(1)} (${c.store.reviewCount})`);
  if (c.open === true) bits.push("abierto ahora");
  else if (c.open === false && q.openNow === false && c.store.week) bits.push("cerrado ahora");
  if (c.store.delivery)
    bits.push(c.store.deliveryFee ? `domicilio ${pesos(c.store.deliveryFee)}` : "domicilio");
  if (c.store.discount) bits.push(`-${c.store.discount}%`);
  if (c.distance !== null)
    bits.push(
      c.distance < 1 ? `a ${Math.round(c.distance * 1e3)} m` : `a ${c.distance.toFixed(1)} km`
    );
  bits.push(c.store.municipality);
  return bits.join(" \xB7 ");
}
function chipsFor(q, count, shown) {
  const chips = [];
  if (count > shown) chips.push("Ver m\xE1s");
  if (q.sort !== "cheap") chips.push("M\xE1s baratos");
  if (q.sort !== "best") chips.push("Mejor calificados");
  if (!q.openNow) chips.push("Abiertos ahora");
  if (!q.delivery) chips.push("Con domicilio");
  return chips.slice(0, 4);
}
function link(c, q) {
  return {
    label: c.store.name,
    href: c.product ? productHref(c.store.id, c.product.id) : businessHref(c.store.id),
    sub: why(c, q),
    image: c.product?.image || c.store.logo || c.store.cover
  };
}
function storeFact(s, attribute, question, k, opts) {
  const now3 = opts.now ?? /* @__PURE__ */ new Date();
  const page = { label: `Ver ${s.name}`, href: businessHref(s.id) };
  const open = openAt(s.week, now3);
  const state2 = open === void 0 ? "" : open ? " Ahora est\xE1 abierto." : " Ahora est\xE1 cerrado.";
  switch (attribute) {
    case "hours": {
      if (!s.hours && !s.week)
        return {
          text: `${s.name} todav\xEDa no public\xF3 su horario. Puedes preguntarle por WhatsApp.`,
          cta: page
        };
      const today2 = bogota(now3).day;
      const d = s.week?.[today2];
      const todayLine = d && !d.closed ? ` Hoy atiende de ${clock(d.opens)} a ${clock(d.closes)}.` : s.week ? " Hoy no abre." : "";
      return {
        text: `Horario de ${s.name}: ${s.hours || "seg\xFAn su p\xE1gina"}.${todayLine}${state2}`,
        cta: page
      };
    }
    case "phone":
    case "whatsapp": {
      const lines = [
        s.whatsapp && `WhatsApp ${s.whatsapp}`,
        s.phone && `tel\xE9fono ${s.phone}`,
        s.email && `correo ${s.email}`
      ].filter(Boolean);
      return {
        text: lines.length ? `Puedes contactar a ${s.name} por ${lines.join(", ")}.` : `${s.name} no public\xF3 datos de contacto; escr\xEDbele desde su p\xE1gina.`,
        cta: s.whatsapp ? {
          label: "Escribir por WhatsApp",
          href: `https://wa.me/${s.whatsapp.replace(/\D/g, "")}`
        } : page
      };
    }
    case "address":
      return {
        text: `${s.name} queda en ${s.address ? `${s.address}, ` : ""}${s.municipality} (${s.region}).`,
        cta: {
          label: "Ver en el mapa",
          href: s.lat !== null && s.lng !== null ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address} ${s.municipality} Sucre Colombia`)}`
        }
      };
    case "delivery":
      return {
        text: s.delivery ? `S\xED, ${s.name} hace domicilios${s.deliveryFee ? ` (costo ${pesos(s.deliveryFee)})` : ""}. El env\xEDo lo coordinas con el negocio al pedir por WhatsApp.` : `${s.name} no tiene domicilio activado en SucreIA; puedes recoger en ${s.address || s.municipality} o preguntarle por WhatsApp.`,
        cta: page
      };
    case "payment":
      return {
        text: `En SucreIA el pago se acuerda directamente con ${s.name} al hacer el pedido por WhatsApp (efectivo, Nequi, transferencia u otro medio que el negocio acepte). La plataforma no cobra en l\xEDnea.`,
        cta: page
      };
    case "reviews": {
      if (!s.reviewCount)
        return {
          text: `${s.name} todav\xEDa no tiene rese\xF1as. Si eres cliente, puedes ser el primero: en su p\xE1gina, pesta\xF1a \xABRese\xF1as\xBB \u2192 \xABA\xF1adir rese\xF1a\xBB.`,
          cta: { label: `Rese\xF1as de ${s.name}`, href: `${businessHref(s.id)}&ver=resenas` }
        };
      const quote = s.reviews[0];
      return {
        text: `${s.name} tiene \u2605 ${s.rating.toFixed(1)} de 5 con ${s.reviewCount} ${s.reviewCount === 1 ? "rese\xF1a" : "rese\xF1as"}.${quote ? ` ${quote.name} dijo: \xAB${quote.comment}\xBB` : ""}`,
        cta: page
      };
    }
    case "social": {
      const nets = Object.entries(s.social).filter(([, v]) => v);
      return {
        text: nets.length ? `Redes de ${s.name}: ${nets.map(([n]) => n[0].toUpperCase() + n.slice(1)).join(", ")}. Est\xE1n en su p\xE1gina.` : `${s.name} no public\xF3 redes sociales.`,
        cta: page
      };
    }
    case "promo":
      return {
        text: s.promotions.length ? `${s.name} tiene ${s.promotions.map((p) => `\xAB${p.title}\xBB (-${p.percent}%)`).join(", ")}.` : `${s.name} no tiene promociones activas ahora.`,
        cta: page
      };
    case "price":
    case "products": {
      const u = understand(question);
      const nameRoots = new Set(k.names.find((n) => k.stores[n.store] === s)?.roots ?? []);
      const terms = u.query.terms.filter((t) => !nameRoots.has(t) && !plain(s.name).includes(t));
      let items = productsFor(s, u.query);
      if (terms.length) {
        const si = k.stores.indexOf(s);
        const hit = si >= 0 ? search(k, terms).get(si) : void 0;
        const scored = hit ? [...hit.products].filter(([i]) => items.includes(s.products[i])) : [];
        const top = Math.max(0, ...scored.map(([, v]) => v));
        items = scored.filter(([, v]) => v > 0 && v >= top * 0.5).sort((x, y) => y[1] - x[1]).map(([i]) => s.products[i]);
      }
      if (!items.length) {
        const what = terms.length ? `\xAB${terms.join(" ")}\xBB` : "productos con esas condiciones";
        return {
          text: `${s.name} no tiene ${what} en su cat\xE1logo. Puedes preguntarle por WhatsApp o buscarlo en otros negocios.`,
          cta: terms.length ? {
            label: `Buscar ${terms.join(" ")} en SucreIA`,
            href: `/buscar?q=${encodeURIComponent(terms.join(" "))}`
          } : page,
          chips: [
            s.mode === "products" ? "\xBFQu\xE9 productos tiene?" : "\xBFQu\xE9 servicios tiene?",
            "\xBFCu\xE1l es su horario?"
          ]
        };
      }
      const list = items.slice(0, 6);
      return {
        text: `${terms.length ? "Esto encontr\xE9" : s.mode === "products" ? "Productos" : "Servicios"} en ${s.name}:`,
        links: list.map((p) => ({
          label: p.name,
          href: productHref(s.id, p.id),
          sub: [
            p.price > 0 ? pesos(p.price) : "a cotizar",
            p.serves ? `rinde ${p.serves}` : "",
            p.ratingCount ? `\u2605 ${p.rating.toFixed(1)}` : "",
            p.details.slice(0, 2).map((d) => `${d.label}: ${d.value}`).join(" \xB7 ")
          ].filter(Boolean).join(" \xB7 "),
          image: p.image
        })),
        cta: page,
        chips: ["\xBFCu\xE1l es su horario?", "\xBFHacen domicilio?", "\xBFQu\xE9 dicen de este negocio?"]
      };
    }
    default: {
      const bits = [
        s.description,
        `${s.subcategory || s.category} en ${s.municipality}.`,
        s.reviewCount ? `\u2605 ${s.rating.toFixed(1)} (${s.reviewCount} rese\xF1as).` : "",
        s.delivery ? "Hace domicilios." : "",
        state2.trim()
      ].filter(Boolean);
      return {
        text: `${s.name}: ${bits.join(" ")}`,
        cta: page,
        chips: ["\xBFQu\xE9 productos tiene?", "\xBFCu\xE1l es su horario?", "\xBFD\xF3nde queda?"]
      };
    }
  }
}
function answer(question, context, k, opts) {
  const u = understand(question);
  const seed = plain(question);
  const role = opts.role;
  const intro = (text2) => ({ reply: { text: text2 }, context });
  if (u.kind === "empty")
    return intro(
      "Cu\xE9ntame qu\xE9 necesitas y d\xF3nde. Por ejemplo: \xABtorta para 20 personas en Sincelejo\xBB."
    );
  const here = opts.store ? k.stores.find((x) => x.id === opts.store) : void 0;
  if (u.kind === "greeting" && here)
    return {
      reply: {
        text: `\xA1Hola! \u{1F44B} Soy el asistente de ${here.name}. Preg\xFAntame por sus ${here.mode === "products" ? "productos" : "servicios"}, precios, horario, domicilio o ubicaci\xF3n.`,
        chips: [
          here.mode === "products" ? "\xBFQu\xE9 productos tiene?" : "\xBFQu\xE9 servicios tiene?",
          "\xBFCu\xE1l es su horario?",
          "\xBFHacen domicilio?"
        ]
      },
      context
    };
  if (u.kind === "greeting")
    return intro(
      pick(
        [
          "\xA1Hola! \u{1F44B} \xBFQu\xE9 est\xE1s buscando hoy? Puedes decirme el producto o servicio, el municipio y tu presupuesto.",
          "\xA1Hola! \u{1F60A} Dime qu\xE9 necesitas \u2014 por ejemplo \xABalmuerzo de menos de 20 mil en Corozal\xBB \u2014 y te busco las mejores opciones."
        ],
        seed
      )
    );
  if (u.kind === "thanks") return intro("\xA1Con gusto! Si necesitas algo m\xE1s, aqu\xED estoy. \u{1F60A}");
  if (u.kind === "bye") return intro("\xA1Hasta pronto! Que te vaya muy bien. \u{1F44B}");
  const q0 = plain(question);
  if (opts.myStores && /\b(mi negocio|mis negocios|mi emprendimiento|mis emprendimientos|mi tienda|mi registro|estado de)\b/.test(
    q0
  ) && /\b(estado|como va|aprobad|revision|rechaz|publicad|como esta|en que va)\b/.test(q0)) {
    if (!opts.myStores.length)
      return {
        reply: {
          text: "A\xFAn no tienes negocios registrados.",
          cta: { label: "Registrar emprendimiento", href: "/panel/configurar" }
        },
        context
      };
    return {
      reply: {
        text: `As\xED van tus negocios: ${opts.myStores.map((s) => `${s.name}: ${s.status}${s.note ? ` (${s.note})` : ""}`).join(" \xB7 ")}.`,
        cta: { label: "Ir a Mis negocios", href: "/panel/negocios" }
      },
      context
    };
  }
  if (opts.admin && /\b(cuant|pendiente|por revisar|por aprobar|resumen|estadistic)/.test(q0) && /\b(negocio|registro|pqrs|emprendimiento|solicitud)/.test(q0)) {
    const a = opts.admin;
    return {
      reply: {
        text: `Hay ${a.pending} ${a.pending === 1 ? "registro" : "registros"} por revisar, ${a.approved} negocios aprobados y ${a.pqrsPending} PQRS pendientes.`,
        cta: {
          label: a.pending ? "Revisar registros" : "Negocios aprobados",
          href: a.pending ? "/admin" : "/admin/negocios"
        }
      },
      context
    };
  }
  const named = storeNamed(k, question);
  let focus = named !== null ? k.stores[named] : void 0;
  if (!focus && u.pick >= 0 && context.results?.length) {
    const id = u.pick === 9 ? context.results[context.results.length - 1] : context.results[u.pick];
    focus = k.stores.find((s) => s.id === id);
    if (focus && !u.attribute)
      return {
        reply: storeFact(focus, "about", question, k, opts),
        context: { ...context, focus: focus.id }
      };
  }
  if (!focus && opts.store) focus = k.stores.find((s) => s.id === opts.store);
  if (!focus && u.attribute && context.focus && !u.query.terms.length)
    focus = k.stores.find((s) => s.id === context.focus);
  if (!focus && u.attribute && !u.query.terms.length && context.results?.length === 1)
    focus = k.stores.find((s) => s.id === context.results[0]);
  if (focus && (u.attribute || named !== null || opts.store)) {
    const attr = u.attribute ?? (opts.store && u.query.terms.length ? "products" : named !== null ? "about" : "products");
    return {
      reply: storeFact(focus, attr, question, k, opts),
      context: { ...context, focus: focus.id }
    };
  }
  const help = answerHelp(question, role);
  if (help && (!u.query.terms.length || !search(k, u.query.terms).size))
    return { reply: { ...help }, context };
  let q = u.query;
  let offset = 0;
  if (u.followUp && context.query) {
    q = merge(context.query, u.query);
    if (u.more) offset = context.shown ?? PAGE;
  }
  if (!q.terms.length && !q.sector && !q.subcategory && !q.town && !q.region && !q.mode && !q.promo && !q.delivery && !q.openNow) {
    if (help) return { reply: { ...help }, context };
    return intro(
      "Cu\xE9ntame un poco m\xE1s: \xBFqu\xE9 producto o servicio buscas? Tambi\xE9n puedes decirme el municipio o tu presupuesto."
    );
  }
  if (q.near && !opts.location) {
    q = { ...q, near: false, sort: q.sort === "near" ? "relevance" : q.sort };
  }
  let list = candidates(k, q, opts);
  const relaxed = [];
  let tried = q;
  for (const r of relaxers) {
    if (list.length) break;
    if (!r.when(tried)) continue;
    relaxed.push(r.say(tried));
    tried = r.relax(tried);
    list = candidates(k, tried, opts);
  }
  if (!list.length) {
    const what2 = describeQuery(q);
    return {
      reply: {
        text: `No encontr\xE9 emprendimientos para eso${what2 ? ` ${what2}` : ""} por ahora. ${pick(["\xBFY si lo buscas con otras palabras?", "Prueba con otras palabras o en otro municipio."], seed)} Si t\xFA lo ofreces, \xA1podr\xEDas ser el primero en SucreIA! \u{1F680}`,
        cta: role === "cliente" || role === "visitante" ? { label: "Crear mi emprendimiento", href: "/emprender" } : void 0,
        chips: ["Ver todos los negocios"]
      },
      context: { ...context, query: q, results: [], shown: 0 }
    };
  }
  const page = list.slice(offset, offset + PAGE);
  if (!page.length)
    return {
      reply: { text: "Esos fueron todos los resultados. \xBFQuieres que busque algo diferente?" },
      context
    };
  const what = describeQuery(tried);
  const total = list.length;
  const lead = offset > 0 ? `M\xE1s opciones${what ? ` ${what}` : ""}:` : relaxed.length ? `No encontr\xE9 ${relaxed.join(" ni ")}, pero hay ${total} ${total === 1 ? "opci\xF3n" : "opciones"}${what ? ` ${what}` : ""}:` : `${pick(["Encontr\xE9", "Te encontr\xE9", "Hay"], seed)} ${total} ${total === 1 ? "opci\xF3n" : "opciones"}${what ? ` ${what}` : ""}${tried.sort === "cheap" ? ", de la m\xE1s barata a la m\xE1s cara" : tried.sort === "best" ? ", las mejor calificadas primero" : tried.sort === "near" ? ", las m\xE1s cercanas primero" : ""}:`;
  const shown = offset + page.length;
  const searchHref = `/buscar?q=${encodeURIComponent(q.terms.join(" "))}${tried.sector ? `&sector=${encodeURIComponent(tried.sector)}` : ""}${tried.town ? `&municipio=${encodeURIComponent(tried.town)}` : ""}`;
  return {
    reply: {
      text: lead,
      links: page.map((c) => link(c, tried)),
      ...total > PAGE ? { cta: { label: `Ver los ${total} resultados`, href: searchHref } } : {},
      chips: chipsFor(tried, total, shown)
    },
    context: {
      query: tried,
      results: page.map((c) => c.store.id),
      products: Object.fromEntries(
        page.filter((c) => c.product).map((c) => [c.store.id, c.product.id])
      ),
      shown,
      focus: page.length === 1 ? page[0].store.id : void 0
    }
  };
}
