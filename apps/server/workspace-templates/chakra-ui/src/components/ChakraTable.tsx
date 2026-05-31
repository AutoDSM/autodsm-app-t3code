import { Table, Tbody, Td, Th, Thead, Tr, TableContainer } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const ROWS: ReadonlyArray<{ name: string; role: string; status: string }> = [
  { name: "Ada Lovelace", role: "Engineer", status: "Active" },
  { name: "Grace Hopper", role: "Researcher", status: "Active" },
  { name: "Alan Turing", role: "Engineer", status: "Invited" },
];

function Rows(): JSX.Element {
  return (
    <Tbody>
      {ROWS.map((row) => (
        <Tr key={row.name}>
          <Td>{row.name}</Td>
          <Td>{row.role}</Td>
          <Td>{row.status}</Td>
        </Tr>
      ))}
    </Tbody>
  );
}

export function ChakraTable(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <TableContainer w="100%">
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Rows />
        </Table>
      </TableContainer>
    </ChakraPreviewShell>
  );
}

export function ChakraTableStriped(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <TableContainer w="100%">
        <Table variant="striped" colorScheme="purple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Rows />
        </Table>
      </TableContainer>
    </ChakraPreviewShell>
  );
}

export function ChakraTableSimple(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <TableContainer w="100%">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Rows />
        </Table>
      </TableContainer>
    </ChakraPreviewShell>
  );
}
