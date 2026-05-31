import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Button,
  Text,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraModalProps {
  readonly title?: string;
  readonly body?: string;
}

export function ChakraModal(props: ChakraModalProps): JSX.Element {
  const { title = "Invite teammates", body = "Send invitations to collaborators by email." } =
    props;
  return (
    <ChakraPreviewShell>
      <Modal isOpen onClose={() => {}} motionPreset="none">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>{body}</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3}>
              Cancel
            </Button>
            <Button colorScheme="purple">Send invites</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraPreviewShell>
  );
}

export function ChakraModalSizeXl(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Modal isOpen onClose={() => {}} size="xl" motionPreset="none">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Workspace preferences</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              An extra-large modal with room for richer forms, settings, or onboarding flows.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3}>
              Cancel
            </Button>
            <Button colorScheme="purple">Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraPreviewShell>
  );
}
