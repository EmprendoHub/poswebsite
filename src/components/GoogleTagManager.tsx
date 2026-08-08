import Script from "next/script";

export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  if (!gtmId) {
    console.warn("❌ GTM: NEXT_PUBLIC_GTM_ID is missing or empty");
    return null;
  }

  console.log("✅ GTM: Component rendering with ID:", gtmId);

  return (
    <>
      {/* GTM Script - load early with debug logs */}
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Initialize dataLayer first
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
            console.log('✅ GTM: dataLayer initialized and ready');
            console.log('📊 GTM ID:', '${gtmId}');
            
            // Load GTM script
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);console.log('✅ GTM: Script loading from https://www.googletagmanager.com/gtm.js?id='+i);})(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </>
  );
}
