import { Editable, EditableInput, EditablePreview } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraEditableProps {
  readonly defaultValue?: string;
}

export function ChakraEditable(props: ChakraEditableProps): JSX.Element {
  const { defaultValue = "Click to rename workspace" } = props;
  return (
    <ChakraPreviewShell>
      <Editable defaultValue={defaultValue} fontSize="md" fontWeight="medium">
        <EditablePreview />
        <EditableInput />
      </Editable>
    </ChakraPreviewShell>
  );
}
