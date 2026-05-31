import { Menu, MenuButton, MenuDivider, MenuItem, MenuList, Button } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraMenuProps {
  readonly label?: string;
}

export function ChakraMenu(props: ChakraMenuProps): JSX.Element {
  const { label = "Actions" } = props;
  return (
    <ChakraPreviewShell>
      <Menu isOpen>
        <MenuButton as={Button} colorScheme="purple">
          {label}
        </MenuButton>
        <MenuList>
          <MenuItem>New file</MenuItem>
          <MenuItem>Open file</MenuItem>
          <MenuItem>Duplicate</MenuItem>
          <MenuItem>Archive</MenuItem>
        </MenuList>
      </Menu>
    </ChakraPreviewShell>
  );
}

export function ChakraMenuWithDividers(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Menu isOpen>
        <MenuButton as={Button} colorScheme="purple">
          More
        </MenuButton>
        <MenuList>
          <MenuItem>Profile settings</MenuItem>
          <MenuItem>Notifications</MenuItem>
          <MenuDivider />
          <MenuItem>Help & support</MenuItem>
          <MenuItem>Keyboard shortcuts</MenuItem>
          <MenuDivider />
          <MenuItem color="red.500">Sign out</MenuItem>
        </MenuList>
      </Menu>
    </ChakraPreviewShell>
  );
}
