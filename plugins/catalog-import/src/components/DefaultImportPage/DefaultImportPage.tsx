/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Content,
  ContentHeader,
  Header,
  Page,
  SupportButton,
} from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { Header as BuiHeader } from '@backstage/ui';
import Grid from '@material-ui/core/Grid';
import { useTheme } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { catalogImportTranslationRef } from '../../translation';
import { ImportInfoCard } from '../ImportInfoCard';
import { ImportStepper } from '../ImportStepper';

const DefaultImportPageGrid = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const contentItems = [
    <Grid key={0} item xs={12} md={4} lg={6} xl={8}>
      <ImportInfoCard />
    </Grid>,

    <Grid key={1} item xs={12} md={8} lg={6} xl={4}>
      <ImportStepper />
    </Grid>,
  ];

  return (
    <Grid container spacing={2}>
      {isMobile ? contentItems : [...contentItems].reverse()}
    </Grid>
  );
};

/**
 * The default catalog import page.
 *
 * @public
 */
export const DefaultImportPage = () => {
  const { t } = useTranslationRef(catalogImportTranslationRef);
  const configApi = useApi(configApiRef);
  const appTitle = configApi.getOptionalString('app.title') || 'Backstage';

  return (
    <Page themeId="home">
      <Header title={t('defaultImportPage.headerTitle')} />
      <Content>
        <ContentHeader
          title={t('defaultImportPage.contentHeaderTitle', { appTitle })}
        >
          <SupportButton>
            {t('defaultImportPage.supportTitle', { appTitle })}
          </SupportButton>
        </ContentHeader>

        <DefaultImportPageGrid />
      </Content>
    </Page>
  );
};

/**
 * @alpha
 */
export const NfsDefaultImportPage = () => {
  const { t } = useTranslationRef(catalogImportTranslationRef);
  const configApi = useApi(configApiRef);
  const appTitle = configApi.getOptionalString('app.title') || 'Backstage';

  return (
    <>
      <BuiHeader
        title={t('defaultImportPage.contentHeaderTitle', { appTitle })}
        customActions={
          <SupportButton>
            {t('defaultImportPage.supportTitle', { appTitle })}
          </SupportButton>
        }
      />
      <Content>
        <DefaultImportPageGrid />
      </Content>
    </>
  );
};
