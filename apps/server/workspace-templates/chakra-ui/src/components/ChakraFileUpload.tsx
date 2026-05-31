import { Box, Button, FormControl, FormLabel, Input, Text, VStack } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraFileUploadProps {
  readonly label?: string;
  readonly hint?: string;
}

export function ChakraFileUpload(props: ChakraFileUploadProps): JSX.Element {
  const { label = "Upload avatar", hint = "PNG, JPG up to 5MB" } = props;
  return (
    <ChakraPreviewShell>
      <FormControl>
        <FormLabel>{label}</FormLabel>
        <Box
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="gray.300"
          borderRadius="md"
          p={6}
          textAlign="center"
        >
          <VStack spacing={2}>
            <Text fontWeight="medium">Drag and drop, or browse</Text>
            <Text fontSize="sm" color="gray.500">
              {hint}
            </Text>
            <Button as="label" size="sm" colorScheme="purple" cursor="pointer">
              Choose file
              <Input type="file" display="none" />
            </Button>
          </VStack>
        </Box>
      </FormControl>
    </ChakraPreviewShell>
  );
}
