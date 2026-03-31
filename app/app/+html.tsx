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

        <title>Tankuy</title>
        <meta name="description" content="Track your fuel expenses with ease. Scan receipts, view spending charts and find nearby gas stations." />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

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