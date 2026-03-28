app.enableCors({
  origin: [
    'https://orientations.yira-ci.com', // Votre nouveau site
    'https://www.yira-ci.com',
    'http://localhost:3000' // Pour vos tests locaux
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});