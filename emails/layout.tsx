import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Img,
  Text,
  Link,
  Hr,
} from "@react-email/components";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const brand = {
  navy: "#033A7A",
  text: "#1a1a1a",
  muted: "#6b7280",
};

export const button: React.CSSProperties = {
  backgroundColor: brand.navy,
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: 6,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 16,
  display: "inline-block",
};

export const detailBox: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  margin: "16px 0",
};

export function siteUrl(): string {
  return site;
}

export function Layout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f3f4f6",
          margin: 0,
          padding: "24px 0",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>
          <Section
            style={{
              backgroundColor: brand.navy,
              padding: "24px",
              textAlign: "center" as const,
              borderRadius: "8px 8px 0 0",
            }}
          >
            <Img
              src={`${site}/email/youthpinoy-email-logo.png`}
              width={280}
              alt="YouthPinoy"
              style={{ margin: "0 auto" }}
            />
          </Section>

          <Section
            style={{
              backgroundColor: "#ffffff",
              padding: "32px",
              color: brand.text,
              fontSize: 16,
              lineHeight: "1.6",
            }}
          >
            {children}
          </Section>

          <Section style={{ padding: "16px 32px 8px" }}>
            <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 12px" }} />
            <Text style={{ fontSize: 12, color: brand.muted, margin: 0, lineHeight: "1.6" }}>
              YouthPinoy · Catholic Social Media Summit
              <br />
              <Link href={site} style={{ color: brand.muted, textDecoration: "underline" }}>
                {site.replace(/^https?:\/\//, "")}
              </Link>
              <br />
              You&apos;re receiving this because you have an account on the YouthPinoy Portal.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
