import { Tabs, TabList, TabPanels, Tab, TabPanel, Text } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

interface PanelText {
  readonly overview: string;
  readonly details: string;
  readonly activity: string;
}

const DEFAULT_PANELS: PanelText = {
  overview: "Summary of your workspace, recent activity, and pinned items.",
  details: "Workspace metadata, members, and integrations.",
  activity: "Timeline of recent events across the workspace.",
};

function Panels({ panels }: { panels: PanelText }): JSX.Element {
  return (
    <TabPanels>
      <TabPanel>
        <Text>{panels.overview}</Text>
      </TabPanel>
      <TabPanel>
        <Text>{panels.details}</Text>
      </TabPanel>
      <TabPanel>
        <Text>{panels.activity}</Text>
      </TabPanel>
    </TabPanels>
  );
}

export interface ChakraTabsProps {
  readonly defaultIndex?: number;
}

export function ChakraTabs(props: ChakraTabsProps): JSX.Element {
  const { defaultIndex = 0 } = props;
  return (
    <ChakraPreviewShell>
      <Tabs defaultIndex={defaultIndex} w="100%">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Details</Tab>
          <Tab>Activity</Tab>
        </TabList>
        <Panels panels={DEFAULT_PANELS} />
      </Tabs>
    </ChakraPreviewShell>
  );
}

export function ChakraTabsEnclosed(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Tabs variant="enclosed" w="100%">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Details</Tab>
          <Tab>Activity</Tab>
        </TabList>
        <Panels panels={DEFAULT_PANELS} />
      </Tabs>
    </ChakraPreviewShell>
  );
}

export function ChakraTabsLine(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Tabs variant="line" w="100%">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Details</Tab>
          <Tab>Activity</Tab>
        </TabList>
        <Panels panels={DEFAULT_PANELS} />
      </Tabs>
    </ChakraPreviewShell>
  );
}

export function ChakraTabsSoftRounded(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Tabs variant="soft-rounded" colorScheme="purple" w="100%">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Details</Tab>
          <Tab>Activity</Tab>
        </TabList>
        <Panels panels={DEFAULT_PANELS} />
      </Tabs>
    </ChakraPreviewShell>
  );
}
