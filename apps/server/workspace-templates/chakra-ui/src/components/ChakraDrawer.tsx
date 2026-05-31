import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Button,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

type Placement = "left" | "right" | "top" | "bottom";

export interface ChakraDrawerProps {
  readonly placement?: Placement;
  readonly title?: string;
}

function DrawerBodyContent(): JSX.Element {
  return (
    <Stack spacing={3}>
      <Text>Workspace settings</Text>
      <Text>Notifications</Text>
      <Text>Members</Text>
      <Text>Billing</Text>
    </Stack>
  );
}

export function ChakraDrawer(props: ChakraDrawerProps): JSX.Element {
  const { placement = "right", title = "Workspace" } = props;
  return (
    <ChakraPreviewShell>
      <Drawer isOpen placement={placement} onClose={() => {}}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{title}</DrawerHeader>
          <DrawerBody>
            <DrawerBodyContent />
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" mr={3}>
              Cancel
            </Button>
            <Button colorScheme="purple">Save</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </ChakraPreviewShell>
  );
}

export interface ChakraDrawerVariantProps {
  readonly title?: string;
}

function DrawerVariant({ placement, title }: { placement: Placement; title: string }): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Drawer isOpen placement={placement} onClose={() => {}}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{title}</DrawerHeader>
          <DrawerBody>
            <DrawerBodyContent />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </ChakraPreviewShell>
  );
}

export function ChakraDrawerLeft(props: ChakraDrawerVariantProps): JSX.Element {
  return <DrawerVariant placement="left" title={props.title ?? "Navigation"} />;
}

export function ChakraDrawerRight(props: ChakraDrawerVariantProps): JSX.Element {
  return <DrawerVariant placement="right" title={props.title ?? "Details"} />;
}

export function ChakraDrawerTop(props: ChakraDrawerVariantProps): JSX.Element {
  return <DrawerVariant placement="top" title={props.title ?? "Announcement"} />;
}

export function ChakraDrawerBottom(props: ChakraDrawerVariantProps): JSX.Element {
  return <DrawerVariant placement="bottom" title={props.title ?? "Quick actions"} />;
}
