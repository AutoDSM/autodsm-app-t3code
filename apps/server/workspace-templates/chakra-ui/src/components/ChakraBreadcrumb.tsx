import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraBreadcrumbProps {
  readonly separator?: string;
}

export function ChakraBreadcrumb(props: ChakraBreadcrumbProps): JSX.Element {
  const { separator = "/" } = props;
  return (
    <ChakraPreviewShell>
      <Breadcrumb separator={separator}>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Library</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#">Data</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
    </ChakraPreviewShell>
  );
}
