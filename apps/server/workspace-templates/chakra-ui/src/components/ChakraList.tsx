import { List, ListItem, ListIcon, OrderedList, UnorderedList, Icon } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const CHECK_PATH = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

function CheckIcon(): JSX.Element {
  return (
    <Icon viewBox="0 0 24 24" color="green.500">
      <path fill="currentColor" d={CHECK_PATH} />
    </Icon>
  );
}

export function ChakraList(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <List spacing={2}>
        <ListItem>Onboarding</ListItem>
        <ListItem>Theme tokens</ListItem>
        <ListItem>Component library</ListItem>
      </List>
    </ChakraPreviewShell>
  );
}

export function ChakraListUnordered(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <UnorderedList spacing={1}>
        <ListItem>Define tokens</ListItem>
        <ListItem>Wire up theme</ListItem>
        <ListItem>Ship components</ListItem>
      </UnorderedList>
    </ChakraPreviewShell>
  );
}

export function ChakraListOrdered(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <OrderedList spacing={1}>
        <ListItem>Open the workspace</ListItem>
        <ListItem>Pick a starter template</ListItem>
        <ListItem>Review your design tokens</ListItem>
      </OrderedList>
    </ChakraPreviewShell>
  );
}

export function ChakraListIcon(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <List spacing={2}>
        <ListItem>
          <ListIcon as={CheckIcon as unknown as React.ComponentType} />
          Connect your Figma file
        </ListItem>
        <ListItem>
          <ListIcon as={CheckIcon as unknown as React.ComponentType} />
          Generate theme tokens
        </ListItem>
        <ListItem>
          <ListIcon as={CheckIcon as unknown as React.ComponentType} />
          Author components
        </ListItem>
      </List>
    </ChakraPreviewShell>
  );
}
