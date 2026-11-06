import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BatchMail · Cisco NetConnect PUP – Manila",
  description:
    "BatchMail for Cisco NetConnect PUP – Manila. Upload a CSV, personalize an HTML template, preview, and send bulk emails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Runs before paint so a saved light preference never flashes dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("batchmail_dark")==="0")document.documentElement.classList.remove("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="sky" aria-hidden="true">
          <div className="sky-nebula" />
          <div className="sky-field">
            <div className="sky-stars sky-far" />
            <div className="sky-stars sky-near" />
            <div className="sky-stars sky-bright" />
            <div className="sky-stars sky-bright sky-bright-alt" />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
