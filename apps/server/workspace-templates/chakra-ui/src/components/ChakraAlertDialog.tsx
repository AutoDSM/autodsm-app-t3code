import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react";
import { useRef } from "react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraAlertDialogProps {
  readonly title?: string;
  readonly body?: string;
}

export function ChakraAlertDialog(props: ChakraAlertDialogProps): JSX.Element {
  const { title = "Discard changes?", body = "You will lose any unsaved edits to this draft." } =
    props;
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <ChakraPreviewShell>
      <AlertDialog isOpen leastDestructiveRef={cancelRef} onClose={() => {}} motionPreset="none">
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {title}
            </AlertDialogHeader>
            <AlertDialogBody>{body}</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef}>Cancel</Button>
              <Button colorScheme="red" ml={3}>
                Discard
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </ChakraPreviewShell>
  );
}

export interface ChakraAlertDialogDestructiveProps {
  readonly title?: string;
  readonly body?: string;
}

export function ChakraAlertDialogDestructive(
  props: ChakraAlertDialogDestructiveProps,
): JSX.Element {
  const { title = "Delete account?", body = "This action permanently removes all of your data." } =
    props;
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <ChakraPreviewShell>
      <AlertDialog isOpen leastDestructiveRef={cancelRef} onClose={() => {}} motionPreset="none">
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.500">
              {title}
            </AlertDialogHeader>
            <AlertDialogBody>{body}</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef}>Cancel</Button>
              <Button colorScheme="red" ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </ChakraPreviewShell>
  );
}
