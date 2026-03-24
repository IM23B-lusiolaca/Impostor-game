import './globals.css';

export const metadata = {
  title: 'Impostor Word Game',
  description: 'A real-time multiplayer social deduction word game.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="app-container">
          {children}
        </main>
      </body>
    </html>
  );
}
