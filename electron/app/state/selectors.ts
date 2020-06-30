import { selector, selectorFamily } from "recoil";

import { getPage, getSocket } from "../utils/socket";
import {
  mousePosition,
  viewCount,
  mainSize,
  previousMainSize,
  mainTop,
  currentListTop,
  itemsPerRequest,
  segmentIsLoaded,
  gridMargin,
  portNumber,
  liveTop,
  previousLayout,
} from "./atoms";

export const currentListHeight = selector({
  key: "currentListHeight",
  get: ({ get }) => {
    const { height: ibh } = get(itemBaseSize);
    const gm = get(gridMargin);
    const vc = get(viewCount);
    const sbnc = get(segmentBaseNumCols);
    return Math.ceil(vc / sbnc) * (ibh + gm) + gm;
  },
});

export const indicatorIndex = selector({
  key: "indicatorIndex",
  get: ({ get }) => {
    const [unused, mpt] = get(mousePosition);
    const mt = get(mainTop);
    const ms = get(mainSize);
    const vc = get(viewCount);
    const numerator = Math.max(mpt, 0) - mt;
    const denominator = ms[1] - 16;
    return Math.min(
      Math.max(vc - 1, 0),
      parseInt((numerator / denominator) * (vc - 1))
    );
  },
});

export const indicatorIndexPercentage = selector({
  key: "indicatorIndexPercentage",
  get: ({ get }) => {
    const vc = get(viewCount);
    const ii = get(indicatorIndex);
    const perc = vc === 0 ? 0 : ii / (vc - 1);
    return perc;
  },
});

export const currentIndexIndicatorTop = selector({
  key: "currentIndexIndicatorTop",
  get: ({ get }) => {
    const cip = get(currentIndexPercentage);
    const [unused, mh] = get(mainSize);
    return Math.min(mh - 3, Math.max(32, cip * (mh - 35) + 32));
  },
});

export const currentIndexPercentage = selector({
  key: "currentIndexPercentage",
  get: ({ get }) => {
    const clt = get(currentListTop);
    const clh = get(currentListHeight);
    const [unused, mh] = get(mainSize);
    const range = clh - mh;

    if (range <= 0) return 0;
    return clt / range;
  },
  set: ({ get, set }, newValue) => {
    const clh = get(currentListHeight);
    const [unused, mh] = get(mainSize);
    const rh = get(rowHeight);
    const nr = get(numRows);

    set(currentListTop, Math.min(newValue * nr * rh, clh - mh));
    set(liveTop, -1 * Math.min(newValue * nr * rh, clh - mh));
  },
});

export const currentSegment = selector({
  key: "currentSegment",
  get: ({ get }) => {
    const ci = get(currentIndex);
    return get(segmentIndexFromItemIndex(ci));
  },
});

export const numRows = selector({
  key: "numRows",
  get: ({ get }) => {
    const vc = get(viewCount);
    const sbnc = get(segmentBaseNumCols);
    return Math.ceil(vc / sbnc);
  },
});

export const rowHeight = selector({
  key: "rowHeight",
  get: ({ get }) => {
    const { height } = get(itemBaseSize);
    return get(gridMargin) + height;
  },
});

export const currentIndex = selector({
  key: "currentIndex",
  get: ({ get }) => {
    const prevLayout = get(previousLayout);
    const top = get(liveTop);
    const [viewPortWidth, viewPortHeight] = get(mainSize);
    const margin = get(gridMargin);
    if (prevLayout[prevLayout.length - 1][0] < top) {
      return get(indexFromTop(top, viewPortWidth));
    }
    if (prevLayout[0][0] > top) {
      return get(indexFromTop(top, viewPortWidth));
    }
    let start, stop;
    for (let i = 0; i < prevLayout.length; i++) {
      start = prevLayout[i][0].top;
      stop = prevLayout[i][0].top + (prevLayout[i][0].height + margin);
      if (start <= top && stop >= top) {
        return prevLayout[i][0].index;
      }
    }
  },
});

export const currentDisplacement = selector({
  key: "currentDisplacement",
  get: ({ get }) => {},
});

export const currentListTopRange = selector({
  key: "currentListTopRange",
  get: ({ get }) => {
    const clh = get(currentListHeight);
    const [unused, mh] = get(mainSize);
    return [0, clh - mh];
  },
});

export const viewPortWindow = selector({
  key: "viewPortWindow",
  get: ({ get }) => {
    const [unused, mh] = get(mainSize);
    const clt = get(currentListTop);
    return [clt, clt + mh];
  },
});

export const ticks = selector({
  key: "ticks",
  get: ({ get }) => {
    let numTicks = null;
    let tickSize = null;
    const vc = get(viewCount);
    const breakpoints = [...Array(6).keys()].map((i) => Math.pow(10, i + 2));
    for (let i = 0; i < breakpoints.length; i++) {
      const breakpoint = breakpoints[i];
      numTicks = Math.ceil(vc / Math.pow(10, i + 1));
      tickSize = Math.pow(10, i + 1);
      if (vc < breakpoint) break;
    }
    return [...Array(numTicks).keys()].map((i) => i * tickSize);
  },
});

export const numSegments = selector({
  key: "numSegments",
  get: ({ get }) => {
    const ipr = get(itemsPerRequest);
    const vc = get(viewCount);
    return Math.ceil(vc / ipr);
  },
});

export const segmentItemIndices = selectorFamily({
  key: "segmentItemIndices",
  get: (segmentIndex) => ({ get }) => {
    const ipr = get(itemsPerRequest);
    const start = segmentIndex * ipr;
    return [...Array(ipr).keys()].map((i) => start + i);
  },
});

export const segmentData = selectorFamily({
  key: "segmentData",
  get: (segmentIndex) => async ({ get }) => {
    const params = get(pageParams);
    const { mapping, results } = await getPage(getSocket(5151, "state"), {
      ...params,
      page: segmentIndex,
    });
    const [mw, mh] = get(mainSize);
    const data = [];
    let row;
    let ww;
    let top = 0;
    let left;
    let width;
    let height;
    const gm = get(gridMargin);
    for (let i = 0; i < results.length; i++) {
      top += gm;
      left = 0;
      row = results[i];
      ww = mw - (row.length + 1) * gm;
      for (let j = 0; j < row.length; j++) {
        const { percentWidth, aspectRatio, sample } = row[j];
        left += gm;
        width = ww * percentWidth;
        height = width / aspectRatio;
        data.push({
          top,
          left,
          width,
          height,
          sample,
        });
        left += width;
      }
      top += height;
    }
    return data;
  },
});

export const itemKey = selectorFamily({
  key: "itemKey",
  get: (itemIndex) => ({ get }) => {
    const ipr = get(itemsPerRequest);
    return itemIndex % ipr;
  },
});

export const segmentIndexFromItemIndex = selectorFamily({
  key: "segmentIndexFromItemIndex",
  get: (itemIndex) => ({ get }) => {
    const ipr = get(itemsPerRequest);
    return Math.floor(itemIndex / ipr);
  },
});

export const itemIsLoaded = selectorFamily({
  key: "itemIsLoaded",
  get: (itemIndex) => ({ get }) => {
    const si = get(segmentIndexFromItemIndex(itemIndex));
    return get(segmentIsLoaded(si));
  },
});

export const itemData = selectorFamily({
  key: "itemData",
  get: (itemIndex) => ({ get }) => {
    const ik = get(itemKey(itemIndex));
    const si = get(segmentIndexFromItemIndex(itemIndex));
    return get(segmentData(si))[ik];
  },
});

export const mainAspectRatio = selector({
  key: "mainAspectRatio",
  get: ({ get }) => {
    const [mw, mh] = get(mainSize);
    return mh === 0 ? 0 : mw / mh;
  },
});

export const itemBaseSize = selector({
  key: "itemBaseSize",
  get: ({ get }) => {
    const [mw, mh] = get(mainSize);
    const sbnc = get(segmentBaseNumCols);
    const gm = get(gridMargin);
    const workingWidth = mw - (sbnc + 1) * gm;
    return {
      width: workingWidth / sbnc,
      height: workingWidth / sbnc,
    };
  },
});

const itemRowInSegment = selectorFamily({
  key: "itemRowInSegment",
  get: (itemIndex) => ({ get }) => {
    const si = get(segmentIndexFromItemIndex(itemIndex));
    const sbnc = get(segmentBaseNumCols);
    const ipr = get(itemsPerRequest);
    return Math.floor(itemIndex / sbnc) - Math.ceil((si * ipr) / sbnc);
  },
});

export const itemBasePosition = selectorFamily({
  key: "itemBasePosition",
  get: (itemIndex) => ({ get }) => {
    const ik = get(itemKey(itemIndex));
    const ipr = get(itemsPerRequest);
    const sbnc = get(segmentBaseNumCols);
    const si = get(segmentIndexFromItemIndex(itemIndex));
    const lc = si > 0 ? sbnc - ((ipr * si) % sbnc) : 0;
    const row = get(itemRowInSegment(itemIndex));
    const col = itemIndex % sbnc;
    const { width: ibw, height: ibh } = get(itemBaseSize);
    const gm = get(gridMargin);

    return {
      top: gm + row * (ibh + gm),
      left: gm + col * (ibw + gm),
    };
  },
});

export const pageParams = selector({
  key: "pageParams",
  get: ({ get }) => {
    return {
      length: get(itemsPerRequest),
      threshold: get(tilingThreshold),
    };
  },
});

export const itemPosition = selectorFamily({
  key: "itemPosition",
  get: (itemIndex) => ({ get }) => {
    const id = get(itemData(itemIndex));
    return {
      top: id.top,
      left: id.left,
    };
  },
});

export const itemSize = selectorFamily({
  key: "itemSize",
  get: (itemIndex) => ({ get }) => {
    const { width, height } = get(itemData(itemIndex));
    return {
      width,
      height,
    };
  },
});

export const itemSource = selectorFamily({
  key: "itemSource",
  get: (itemIndex) => ({ get }) => {
    const id = get(itemData(itemIndex));
    const pn = get(portNumber);
    return `http://127.0.0.1:${pn}/?path=${id.sample.filepath}`;
  },
});

export const segmentHeight = selectorFamily({
  key: "segmentHeight",
  get: (segmentIndex) => ({ get }) => {
    return get(segmentBaseSize(segmentIndex)).height;
  },
});

export const segmentsToRender = selector({
  key: "segmentsToRender",
  get: ({ get }) => {
    const ci = get(currentIndex);
    const ipr = get(itemsPerRequest);
    const sbnc = get(segmentBaseNumCols);
    const lt = get(liveTop);
    const cd = 0;
    const [mw, mh] = get(mainSize);
    let h = 0;
    let csi = get(segmentIndexFromItemIndex(ci));
    const st = get(segmentTop(csi));
    const ns = get(numSegments);
    const str = [];
    let sl = mh * 1.3;
    let lc = false;
    let plc = false;
    while ((sl > 0 || lc) && csi < ns) {
      if (plc) break;
      plc = lc;
      lc = (csi > 0 ? sbnc - ((ipr * csi) % sbnc) : 0) > 0;
      sl -= get(segmentHeight(csi)) + (lt + st);
      str.push(csi);
      csi += 1;
    }
    return str;
  },
});

export const itemsToRenderInSegment = selectorFamily({
  key: "itemsToRenderInSegment",
  get: (segmentIndex) => ({ get }) => {
    const ipr = get(itemsPerRequest);
    const st = get(segmentTop(segmentIndex));
    const lt = get(liveTop);
    const [unused, mh] = get(mainSize);
    const ad = st + lt;

    const rh = get(rowHeight);
    let d;
    let r = ipr;
    let s = 0;
    let e = ipr;
    for (let i = 0; i < ipr; i++) {
      d = ad + get(itemRowInSegment(ipr * segmentIndex + i)) * rh;
      if (d < -1.5 * mh) {
        s = i;
      } else if (d > 1.5 * mh) {
        e = i;
        break;
      }
    }

    let start = ipr * segmentIndex;
    return [...Array(e - s).keys()].map((k) => {
      return {
        index: k + start + s,
        key: s + k,
      };
    });
  },
});

export const tilingThreshold = selector({
  key: "tilingThreshold",
  get: ({ get }) => {
    return get(segmentBaseNumCols);
  },
});

export const segmentBaseNumCols = selector({
  key: "segmentBaseNumCols",
  get: ({ get }) => {
    const [mw, unused] = get(mainSize);
    if (mw <= 600) {
      return 2;
    } else if (mw < 768) {
      return 3;
    } else if (mw < 992) {
      return 4;
    } else if (mw < 1200) {
      return 5;
    } else {
      return 7;
    }
  },
});

export const segmentBaseNumRows = selector({
  key: "segmentBaseNumRows",
  get: ({ get }) => {
    const ipr = get(itemsPerRequest);
    const sbnc = get(segmentBaseNumCols);
    return Math.ceil(ipr / sbnc);
  },
});

export const segmentTop = selectorFamily({
  key: "segmentTop",
  get: (segmentIndex) => ({ get }) => {
    const ipr = get(itemsPerRequest);
    const beforeNumItems = ipr * segmentIndex;
    const sbnc = get(segmentBaseNumCols);
    const beforeNumRows = Math.ceil(beforeNumItems / sbnc);
    return get(rowHeight) * beforeNumRows;
  },
});

export const segmentBaseSize = selectorFamily({
  key: "segmentBaseSize",
  get: (segmentIndex) => ({ get }) => {
    const { width: ibw, height: ibh } = get(itemBaseSize);
    const ipr = get(itemsPerRequest);
    const sbnc = get(segmentBaseNumCols);
    const lc = (ipr * segmentIndex) % sbnc;
    let ni = ipr - (lc !== sbnc ? lc : 0);
    const nr = Math.ceil(ni / sbnc);
    const gm = get(gridMargin);
    const width = sbnc * ibw + (sbnc + 1) * gm;
    const height = nr * ibh + nr * gm;
    return {
      width,
      height,
    };
  },
});

export const baseItemSize = selectorFamily({
  key: "baseItemSize",
  get: (viewPortWidth) => ({ get }) => {
    const cols = get(baseNumCols(viewPortWidth));
    const gm = get(gridMargin);
    const size = (viewPortWidth - (cols + 1) * gm) / cols;
    return {
      width: size,
      height: size,
    };
  },
});

export const listHeight = selectorFamily({
  key: "listHeight",
  get: (viewPortWidth) => ({ get }) => {
    const count = get(viewCount);
    const cols = get(baseNumCols(viewPortWidth));
    const margin = get(gridMargin);
    const { height } = get(baseItemSize(viewPortWidth));
    return Math.ceil(count / cols) * height * margin + margin;
  },
});

export const indexFromTop = selectorFamily({
  key: "indexFromTop",
  get: (top, viewPortWidth) => ({ get }) => {
    const cols = baseNumCols(viewPortWidth);
    const { height } = baseItemSize(viewPortWidth);
    const margin = get(gridMargin);
    return Math.floor(top / (height + margin)) * cols;
  },
});

export const displacementFromTop = selectorFamily({
  key: "displacementFromTop",
  get: (top, viewPortWidth) => ({ get }) => {
    const { height } = baseItemSize(viewPortWidth);
    const margin = get(gridMargin);
    return (top % (height + margin)) / (height + margin);
  },
});

export const baseNumCols = selectorFamily({
  key: "baseNumCols",
  get: (viewPortWidth) => ({ get }) => {
    if (viewPortWidth <= 600) {
      return 2;
    } else if (viewPortWidth < 768) {
      return 3;
    } else if (viewPortWidth < 992) {
      return 4;
    } else if (viewPortWidth < 1200) {
      return 5;
    } else {
      return 7;
    }
  },
});

export const baseLayout = selectorFamily({
  key: "baseLayout",
  get: (top, viewPortWidth, viewPortHeight) => ({ get }) => {
    let start = get(indexFromTop(top, viewPortWidth));
    const count = get(viewCount);
    const cols = get(baseNumCols(viewPortWidth));
    start = start - (start % cols);
    const displacement = get(displacementFromTop(top, viewPortWidth));
    const size = get(baseItemSize(viewPortWidth));
    const margin = get(gridMargin);
    let height = -1 * displacement * (margin + size.height);
    const layout = [];
    let index = start;
    while (height < viewPortHeight * 1.5 && index < count) {
      layout.push(
        [...Array(cols).keys()].map((i) => ({
          index: index + i,
          ...size,
          left: i * (size.width + margin),
          top: Math.floor(index / cols) * (size.height + margin),
        }))
      );
      index += cols;
      height += margin + size.height;
    }
    height = displacement * (margin + size.height);
    index = start + cols;
    while (height < viewPortHeight * 0.5) {
      layout.prepend(
        [...Array(cols).keys()].map((i) => ({
          index: index + i,
          ...size,
          left: i * (size.width + margin),
          top: Math.floor(index / cols) * (size.height + margin),
        }))
      );
      index -= cols;
      height += margin + size.height;
    }

    return layout;
  },
});

export const itemsToRender = selector({
  key: "itemsToRender",
  get: ({ get }) => {
    const start = get(currentIndex);
    const displacement = get(currentDisplacement);
    const [viewPortWidth, viewPortHeight] = get(mainSize);
  },
});
