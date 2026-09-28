import * as React from "react";
import { Text, Button, Link, Section } from "@react-email/components";
import { Layout, button, detailBox, siteUrl } from "./layout";

export type EventRegisteredProps = {
  eventTitle: string;
  slug: string;
  whenText: string;
  location: string;
  joinLink?: string | null;
};

export function EventRegisteredEmail({
  eventTitle,
  slug,
  whenText,
  location,
  joinLink,
}: EventRegisteredProps) {
  const site = siteUrl();
  return (
    <Layout preview={`You're registered for ${eventTitle}`}>
      <Text style={{ marginTop: 0 }}>
        You&apos;re registered for <strong>{eventTitle}</strong>. 🎉
      </Text>

      <Section style={detailBox}>
        <Text style={{ margin: 0, fontWeight: 600 }}>{eventTitle}</Text>
        <Text style={{ margin: "6px 0 0" }}>{whenText}</Text>
        <Text style={{ margin: "6px 0 0" }}>{location}</Text>
        {joinLink ? (
          <Text style={{ margin: "6px 0 0" }}>
            Join link: <Link href={joinLink}>{joinLink}</Link>
          </Text>
        ) : null}
      </Section>

      <Text>What happens next: we&apos;ll send reminders before the event.</Text>

      <Button href={`${site}/events/${slug}`} style={button}>
        View event
      </Button>
    </Layout>
  );
}

export default EventRegisteredEmail;
