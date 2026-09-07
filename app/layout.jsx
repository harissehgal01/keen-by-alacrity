export const metadata = {
  title: "Keen by Alacrity",
  description: "Points and attendance for Alacrity Designs students.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Keen", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F3F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F0E" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
