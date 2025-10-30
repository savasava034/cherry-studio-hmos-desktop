import { GithubOutlined } from '@ant-design/icons'
import IndicatorLight from '@renderer/components/IndicatorLight'
import { HStack } from '@renderer/components/Layout'
import { APP_NAME, AppLogo } from '@renderer/config/env'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useMinappPopup } from '@renderer/hooks/useMinappPopup'
import { useRuntime } from '@renderer/hooks/useRuntime'
import { useSettings } from '@renderer/hooks/useSettings'
import i18n from '@renderer/i18n'
import { handleSaveData, useAppDispatch } from '@renderer/store'
import { setUpdateState } from '@renderer/store/runtime'
import { ThemeMode } from '@renderer/types'
import { runAsyncFunction } from '@renderer/utils'
import { UpgradeChannel } from '@shared/config/constant'
import { Avatar, Button, Progress, Radio, Row, Tag, Tooltip } from 'antd'
import { debounce } from 'lodash'
import { Bug, FileCheck, Github, Globe, Mail, Rss } from 'lucide-react'
import { BadgeQuestionMark } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingTitle } from '.'

const AboutSettings: FC = () => {
  const [version, setVersion] = useState('')
  const [isPortable, setIsPortable] = useState(false)
  const { t } = useTranslation()
  const { autoCheckUpdate, setAutoCheckUpdate, testPlan, setTestPlan, testChannel, setTestChannel } = useSettings()
  const { theme } = useTheme()
  const dispatch = useAppDispatch()
  const { update } = useRuntime()
  const { openMinapp } = useMinappPopup()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onCheckUpdate = debounce(
    async () => {
      if (update.checking || update.downloading) {
        return
  ... (truncated) ...

  // More code here
};

export default AboutSettings;
