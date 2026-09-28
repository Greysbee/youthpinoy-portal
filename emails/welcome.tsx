import * as React from "react";
import { Text, Button, Link } from "@react-email/components";
import { Layout, button, siteUrl } from "./layout";

export type WelcomeProps = {
  firstName: string;
  allAccess?: boolean;
  editions?: string[];
};

export function WelcomeEmail({ firstName, allAccess = false, editions = [] }: WelcomeProps) {
  const site = siteUrl();
  return (
    <Layout preview={`Welcome to the YouthPinoy Portal, ${firstName}!`}>
      <Text style={{ marginTop: 0 }}>
        Hi {firstName}, your YouthPinoy Portal account is ready.
      </Text>

      {allAccess ? (
        <Text>
          You have <strong>All-Access</strong> — every CSMS recording, including future editions.
        </Text>
      ) : editions.length > 0 ? (
        <>
          <Text>Good news — your past CSMS access is already in your account:</Text>
          <Text style={{ fontWeight: 600 }}>{editions.join(", ")}</Text>
        </>
      ) : (
        <Text>
          Start with our free videos in the Library, and check out upcoming events.
        </Text>
      )}

      <Button href={`${site}/library`} style={button}>
        Go to the Library
      </Button>

      <Text style={{ marginTop: 20 }}>
        <Link href={`${site}/events`}>See upcoming events</Link>
      </Text>
    </Layout>
  );
}

export default WelcomeEmail;
