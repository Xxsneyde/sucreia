import { smtpConfig, smtpSender } from '../mail.ts';
try {
  const config = smtpConfig(process.env);
  if (!config)
    throw new Error(
      'Configura SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM y PUBLIC_URL primero.',
    );
  await smtpSender(config).verify();
  console.log('La conexión y autenticación SMTP funcionan. No se envió ningún correo.');
} catch {
  console.error(
    'No se pudo verificar SMTP. Revisa las variables de configuración y el acceso al servidor. No se envió ningún correo.',
  );
  process.exitCode = 1;
}
