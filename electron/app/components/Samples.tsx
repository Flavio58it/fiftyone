import React, { useState, useEffect, useContext } from "react";
import InfiniteScroll from "react-infinite-scroller";
import useMeasure from "react-use-measure";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { Grid, Loader, Dimmer } from "semantic-ui-react";
import styled, { ThemeContext } from "styled-components";
import CircularProgress from "@material-ui/core/CircularProgress";

import Sample from "./Sample";
import connect from "../utils/connect";
import tile from "./Samples.hooks";
import * as atoms from "../recoil/atoms";

function Samples({ setView }) {
  const theme = useContext(ThemeContext);
  const port = useRecoilValue(atoms.port);
  const setCurrentSamples = useSetRecoilState(atoms.currentSamples);
  const [containerRef, bounds] = useMeasure();

  const [scrollState, setScrollState] = tile(port);
  useEffect(() => {
    setCurrentSamples(scrollState.rows.map((row) => row.samples).flat());
  }, [scrollState.rows]);

  return (
    <div ref={containerRef}>
      <InfiniteScroll
        pageStart={1}
        initialLoad={true}
        loadMore={() =>
          !scrollState.isLoading && !scrollState.loadMore
            ? setScrollState({ ...scrollState, loadMore: true })
            : null
        }
        hasMore={scrollState.hasMore}
        useWindow={true}
      >
        {scrollState.rows.map((r, i) => (
          <Grid
            columns={r.samples.length}
            style={{ ...r.style, height: bounds.width / r.aspectRatio }}
            key={i}
          >
            {r.samples.map((s, j) => (
              <Grid.Column key={j} style={{ padding: 0, width: "100%" }}>
                <Sample
                  sample={s.sample}
                  metadata={s.metadata}
                  setView={setView}
                />
              </Grid.Column>
            ))}
          </Grid>
        ))}
        {scrollState.isLoading ? (
          <Grid columns={1}>
            <Grid.Column
              style={{
                width: "100%",
                textAlign: "center",
                color: theme.fontDark,
              }}
            >
              <CircularProgress color="inherit" />
            </Grid.Column>
          </Grid>
        ) : null}
      </InfiniteScroll>
    </div>
  );
}

export default Samples;
