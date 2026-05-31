import {
  FormControl,
  FormLabel,
  Select,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSelectProps {
  readonly label?: string;
}

export function ChakraSelect(props: ChakraSelectProps): JSX.Element {
  const { label = "Theme" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl>
        <FormLabel>{label}</FormLabel>
        <Select defaultValue="light">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </Select>
      </FormControl>
    </ChakraPreviewShell>
  );
}

export function ChakraSelectMulti(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Stack spacing={2}>
        <FormControl>
          <FormLabel>Tags</FormLabel>
          <Select multiple defaultValue={["design", "engineering"]} height="auto" py={1}>
            <option value="design">Design</option>
            <option value="engineering">Engineering</option>
            <option value="product">Product</option>
            <option value="research">Research</option>
          </Select>
        </FormControl>
        <Stack direction="row" spacing={2}>
          <Tag colorScheme="purple">
            <TagLabel>Design</TagLabel>
            <TagCloseButton />
          </Tag>
          <Tag colorScheme="purple">
            <TagLabel>Engineering</TagLabel>
            <TagCloseButton />
          </Tag>
        </Stack>
      </Stack>
    </ChakraPreviewShell>
  );
}
