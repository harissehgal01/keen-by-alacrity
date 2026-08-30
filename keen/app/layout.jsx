export const metadata = {
  title: "Keen by Alacrity",
  description: "Points and attendance for Alacrity Designs students.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/mark-dark.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
