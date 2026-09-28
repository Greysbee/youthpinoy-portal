import * as React from "react";
import { Text, Button } from "@react-email/components";
import { Layout, button, siteUrl } from "./layout";

export type GroupJoinedProps = {
  memberName: string;
  groupName: string;
  seatsUsed: number;
  seatsTotal: number;
  groupId: string;
};

export function GroupJoinedEmail({
  memberName,
  groupName,
  seatsUsed,
  seatsTotal,
  groupId,
}: GroupJoinedProps) {
  const site = siteUrl();
  return (
    <Layout preview={`${memberName} joined ${groupName}`}>
      <Text style={{ marginTop: 0 }}>
        <strong>{memberName}</strong> joined <strong>{groupName}</strong>.
      </Text>
      <Text>
        {seatsUsed} of {seatsTotal} seats used.
      </Text>
      <Button href={`${site}/account/groups/${groupId}`} style={button}>
        Manage group
      </Button>
    </Layout>
  );
}

export default GroupJoinedEmail;
