import React, { useEffect, useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";
import { animated, useSpring } from "react-spring";
import { useWheel } from "react-use-gesture";

import {
  segmentIsLoaded,
  viewCount,
  isMainWidthResizing,
  mainTop,
  mainLoaded,
  mainSize,
  currentListTop,
  liveTop,
} from "../../state/atoms";
import { useTrackMousePosition, useResizeObserver } from "../../state/hooks";
import {
  segmentsToRender,
  currentListTopRange,
  currentListHeight,
} from "../../state/selectors";

import Segment from "./Segment";
import Scrubber from "./Scrubber";

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
`;

const Flashlight = styled.div`
  display: block;
  width: 100%;
  height: 100%;
`;

const ListContainer = styled.div`
  position: relative;
  width: 100%;
`;

const ListMain = styled.div`
  position: relative;
  flex: 1;
  height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
  will-change: transform;

  ::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
`;

export default () => {
  const segmentsToRenderValue = useRecoilValue(segmentsToRender);
  const setIsMainWidthResizing = useSetRecoilState(isMainWidthResizing);
  const [mainSizeValue, setMainSize] = useRecoilState(mainSize);
  const currentListHeightValue = useRecoilValue(currentListHeight);
  const setMainTop = useSetRecoilState(mainTop);
  const [mainLoadedValue, setMainLoaded] = useRecoilState(mainLoaded);
  const setLiveTop = useSetRecoilState(liveTop);
  const setViewCount = useSetRecoilState(viewCount);

  const [ref, { contentRect }] = useResizeObserver();
  useTrackMousePosition();
  useEffect(() => {
    setViewCount(50);
  }, []);

  useLayoutEffect(() => {
    if (!contentRect) return;
    let timeout = setTimeout(() => {
      setIsMainWidthResizing(false);
    }, 1000);
    const { top, width, height } = contentRect;
    let raf = requestAnimationFrame(() => {
      setIsMainWidthResizing(width !== mainSizeValue[0]);
      setMainSize([width, height]);
      setMainTop(top);
      !mainLoadedValue && setMainLoaded(true);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [ref, contentRect]);

  return (
    <Flashlight>
      <Container>
        <ListMain ref={ref} onScroll={(e) => setLiveTop(e.target.scrollTop)}>
          <ListContainer style={{ height: currentListHeightValue }}>
            {mainLoadedValue
              ? segmentsToRenderValue.map((index) => (
                  <Segment key={index} index={index} />
                ))
              : null}
          </ListContainer>
        </ListMain>
        <Scrubber />
      </Container>
    </Flashlight>
  );
};
