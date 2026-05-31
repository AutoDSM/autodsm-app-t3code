import {
  RangeSlider,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  RangeSliderTrack,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Box,
} from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraSliderProps {
  readonly defaultValue?: number;
}

export function ChakraSlider(props: ChakraSliderProps): JSX.Element {
  const { defaultValue = 40 } = props;
  return (
    <ChakraPreviewShell>
      <Box w="100%">
        <Slider defaultValue={defaultValue} aria-label="single">
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>
    </ChakraPreviewShell>
  );
}

export function ChakraSliderRange(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Box w="100%">
        <RangeSlider defaultValue={[20, 70]} aria-label={["min", "max"]}>
          <RangeSliderTrack>
            <RangeSliderFilledTrack />
          </RangeSliderTrack>
          <RangeSliderThumb index={0} />
          <RangeSliderThumb index={1} />
        </RangeSlider>
      </Box>
    </ChakraPreviewShell>
  );
}

export function ChakraSliderMarks(): JSX.Element {
  return (
    <ChakraPreviewShell>
      <Box w="100%" pt={6} pb={2}>
        <Slider defaultValue={50} aria-label="marks">
          <SliderMark value={25} fontSize="xs" mt={3} ml={-2}>
            25%
          </SliderMark>
          <SliderMark value={50} fontSize="xs" mt={3} ml={-2}>
            50%
          </SliderMark>
          <SliderMark value={75} fontSize="xs" mt={3} ml={-2}>
            75%
          </SliderMark>
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>
    </ChakraPreviewShell>
  );
}
