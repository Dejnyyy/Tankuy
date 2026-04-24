import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Title is set per-page via Stack.Screen options to avoid duplicates */}
        <meta name="description" content="Track your fuel expenses with ease. Scan receipts, view spending charts and find nearby gas stations." />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Tankuy – Fuel Expense Tracker" />
        <meta property="og:description" content="Track your fuel expenses with ease. Scan receipts, view spending charts and find nearby gas stations." />
        <meta property="og:image" content="/og-image.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Tankuy – Fuel Expense Tracker" />
        <meta name="twitter:description" content="Track your fuel expenses with ease. Scan receipts, view spending charts and find nearby gas stations." />
        <meta name="twitter:image" content="/og-image.png" />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Browser chrome color — matches the app's orange primary */}
        <meta name="theme-color" content="#FF9500" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Prevent background-color flicker in dark mode — use actual app theme colors */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #F2F2F7;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0D0D0D;
  }
}`;