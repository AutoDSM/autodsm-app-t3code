import { Card, CardBody, CardHeader, Heading, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraCardProps {
  readonly title?: string;
  readonly body?: string;
}

export function ChakraCard(props: ChakraCardProps): JSX.Element {
  const { title = "Card title", body = "Card content goes here." } = props;
  return (
    <ChakraPreviewShell>
      <Card maxW="sm">
        <CardHeader>
          <Heading size="md">{title}</Heading>
        </CardHeader>
        <CardBody>
          <Text>{body}</Text>
        </CardBody>
      </Card>
    </ChakraPreviewShell>
  );
}

export interface ChakraCardVariantProps {
  readonly title?: string;
  readonly body?: string;
}

export function ChakraCardOutline(props: ChakraCardVariantProps): JSX.Element {
  const { title = "Outline card", body = "A subtle border with no shadow." } = props;
  return (
    <ChakraPreviewShell>
      <Card variant="outline" maxW="sm">
        <CardHeader>
          <Heading size="md">{title}</Heading>
        </CardHeader>
        <CardBody>
          <Text>{body}</Text>
        </CardBody>
      </Card>
    </ChakraPreviewShell>
  );
}

export function ChakraCardFilled(props: ChakraCardVariantProps): JSX.Element {
  const { title = "Filled card", body = "Soft surface, no border." } = props;
  return (
    <ChakraPreviewShell>
      <Card variant="filled" maxW="sm">
        <CardHeader>
          <Heading size="md">{title}</Heading>
        </CardHeader>
        <CardBody>
          <Text>{body}</Text>
        </CardBody>
      </Card>
    </ChakraPreviewShell>
  );
}

export function ChakraCardElevated(props: ChakraCardVariantProps): JSX.Element {
  const { title = "Elevated card", body = "Lifted with shadow for emphasis." } = props;
  return (
    <ChakraPreviewShell>
      <Card variant="elevated" maxW="sm">
        <CardHeader>
          <Heading size="md">{title}</Heading>
        </CardHeader>
        <CardBody>
          <Text>{body}</Text>
        </CardBody>
      </Card>
    </ChakraPreviewShell>
  );
}
