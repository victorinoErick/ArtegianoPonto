import './globals.css';

export const metadata = { title: 'Artegiano · Ponto', description: 'Controle de ponto Artegiano' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#131a15' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Montserrat:wght@500;600&family=Open+Sans:wght@400;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
