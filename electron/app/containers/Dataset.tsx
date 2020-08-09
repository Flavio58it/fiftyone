import React, { useState } from "react";
import { Switch, Route, Link, Redirect, useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import {
  Sidebar,
  Container,
  Menu,
  Ref,
  Sticky,
  Message,
  Segment,
} from "semantic-ui-react";

import SamplesContainer from "./SamplesContainer";
import Distributions from "../components/Distributions";
import HorizontalNav from "../components/HorizontalNav";
import InfoItem from "../components/InfoItem";
import Player51 from "../components/Player51";
import SampleModal from "../components/SampleModal";
import Search from "../components/Search";
import { ModalWrapper, Overlay } from "../components/utils";
import routes from "../constants/routes.json";
import * as selectors from "../recoil/selectors";
import connect from "../utils/connect";

function NoDataset() {
  return (
    <Segment>
      <Message>No dataset loaded</Message>
    </Segment>
  );
}

function Dataset(props) {
  const { path, url } = useRouteMatch();
  const { connected, loading, port, state, displayProps } = props;
  const hasDataset = Boolean(state && state.dataset);
  const tabs = [routes.SAMPLES, routes.TAGS, routes.LABELS, routes.SCALARS];
  const [modal, setModal] = useState({ visible: false, sample: null });
  const colorMapping = useRecoilValue(selectors.labelColorMapping);

  const handleHideModal = () => setModal({ visible: false, sample: null });

  let src = null;
  let s = null;
  if (modal.sample) {
    const path = modal.sample.filepath;
    const id = modal.sample._id.$oid;
    const host = `http://127.0.0.1:${port}/`;
    src = `${host}?path=${path}&id=${id}`;
    s = modal.sample;
  }
  if (loading) {
    return <Redirect to={routes.LOADING} />;
  }

  if (!connected) {
    return <Redirect to={routes.SETUP} />;
  }

  return (
    <>
      {modal.visible ? (
        <ModalWrapper>
          <Overlay onClick={handleHideModal} />
          <SampleModal
            activeLabels={displayProps.activeLabels}
            colorMapping={colorMapping}
            sample={modal.sample}
            sampleUrl={src}
            onClose={handleHideModal}
          />
        </ModalWrapper>
      ) : null}
      <Container fluid={true}>
        <HorizontalNav
          currentPath={props.location.pathname}
          entries={tabs.map((path) => ({ path, name: path.slice(1) }))}
        />
        <Switch>
          <Route exact path={routes.DATASET}>
            <Redirect to={routes.SAMPLES} />
          </Route>
          {hasDataset ? (
            <>
              <Route path={routes.SAMPLES}>
                <SamplesContainer
                  {...props.socket}
                  setView={setModal}
                  displayProps={displayProps}
                />
              </Route>
              <Route path={routes.LABELS}>
                <Distributions group="labels" />
              </Route>
              <Route path={routes.TAGS}>
                <Distributions group="tags" />
              </Route>
              <Route path={routes.SCALARS}>
                <Distributions group="scalars" />
              </Route>
            </>
          ) : (
            <NoDataset />
          )}
        </Switch>
      </Container>
    </>
  );
}

export default connect(Dataset);
