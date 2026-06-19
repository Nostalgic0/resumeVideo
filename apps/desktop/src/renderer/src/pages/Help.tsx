import { useTranslation } from '../i18n/useTranslation'

export default function Help(): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="page help-page">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('help.title')}</h2>
        </div>
        <div className="panel-body">
          <div className="help-section">
            <h3>{t('help.howItWorks')}</h3>
            <p>{t('help.howItWorksDesc')}</p>
          </div>

          <div className="help-section">
            <h3>{t('help.requirements')}</h3>
            <ul>
              <li>{t('help.reqFfmpeg')}</li>
              <li>{t('help.reqWhisper')}</li>
              <li>{t('help.reqApiKey')}</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>{t('help.formats')}</h3>
            <p className="help-tags">
              <span className="tag">MP4</span>
              <span className="tag">MKV</span>
              <span className="tag">AVI</span>
              <span className="tag">MOV</span>
              <span className="tag">WebM</span>
              <span className="tag">M4V</span>
              <span className="tag">WMV</span>
              <span className="tag">FLV</span>
            </p>
          </div>

          <div className="help-section">
            <h3>{t('help.videoLanguages')}</h3>
            <p className="help-tags">
              <span className="tag">{t('settings.spanish')}</span>
              <span className="tag">{t('settings.english')}</span>
              <span className="tag">{t('settings.portuguese')}</span>
              <span className="tag">{t('settings.french')}</span>
              <span className="tag">German</span>
              <span className="tag">Italian</span>
              <span className="tag">{t('help.autoDetect')}</span>
            </p>
          </div>

          <div className="help-section">
            <h3>{t('help.whereSaved')}</h3>
            <p>{t('help.whereSavedDesc')}</p>
          </div>

          <div className="help-section">
            <h3>{t('help.privacy')}</h3>
            <p>{t('help.privacyDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
