import * as React from "react";
import { Text, Button, Link, Section } from "@react-email/components";
import { Layout, button, detailBox, siteUrl } from "./layout";

export type OrderPaidProps = {
  orderRef: string;
  eventTitle: string;
  slug: string;
  quantity: number;
  amountText: string;
  paidDate: string;
  paymentMethod?: string | null;
  whenText: string;
  location: string;
  joinLink?: string | null;
  groupId?: string | null;
};

export function OrderPaidEmail({
  orderRef,
  eventTitle,
  slug,
  quantity,
  amountText,
  paidDate,
  paymentMethod,
  whenText,
  location,
  joinLink,
  groupId,
}: OrderPaidProps) {
  const site = siteUrl();
  const line: React.CSSProperties = { margin: "4px 0" };
  return (
    <Layout preview={`Payment received — ${eventTitle}`}>
      <Text style={{ marginTop: 0 }}>Your payment is confirmed. Thank you!</Text>

      <Section style={detailBox}>
        <Text style={{ ...line, marginTop: 0, fontWeight: 600 }}>Payment summary</Text>
        <Text style={line}>Order reference: {orderRef}</Text>
        <Text style={line}>Event: {eventTitle}</Text>
        <Text style={line}>Quantity: {quantity}</Text>
        <Text style={line}>Amount: {amountText}</Text>
        <Text style={line}>Paid: {paidDate}</Text>
        {paymentMethod ? <Text style={line}>Method: {paymentMethod}</Text> : null}
      </Section>

      <Text>Your seat is confirmed.</Text>

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

      {quantity > 1 ? (
        <>
          <Text>
            You have {quantity - 1} extra seat{quantity - 1 !== 1 ? "s" : ""} to share. Set up
            your group and invite people by email — each person gets their own login and access.
          </Text>
          <Button href={`${site}/account/groups/${groupId}`} style={button}>
            Set up my group
          </Button>
        </>
      ) : (
        <Button href={`${site}/events/${slug}`} style={button}>
          View event
        </Button>
      )}

      <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 20 }}>
        This is a payment confirmation, not an official receipt.
      </Text>
    </Layout>
  );
}

export default OrderPaidEmail;
