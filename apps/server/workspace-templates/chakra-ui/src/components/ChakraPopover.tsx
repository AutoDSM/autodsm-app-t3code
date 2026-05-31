import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Button,
  Text,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraPopoverProps {
  readonly title?: string;
  readonly body?: string;
}

export function ChakraPopover(props: ChakraPopoverProps): JSX.Element {
  const { title = "Confirmation", body = "Are you sure you want to publish this draft?" } = props;
  return (
    <ChakraPreviewShell>
      <Popover isOpen returnFocusOnClose={false} closeOnBlur={false}>
        <PopoverTrigger>
          <Button colorScheme="purple">Publish</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader>{title}</PopoverHeader>
          <PopoverBody>
            <Text>{body}</Text>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </ChakraPreviewShell>
  );
}
