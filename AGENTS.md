# AGENTS.md

## 運用メモ

- `iwm-sadatakahp-ops` の自動公開は `systemd --user` で運用する。
- 実体の起動先は `/home/chika3/00common/jobs/iwm-codex-auto-publish.sh`。
- `systemd` ユニットは `iwm-codex-auto-publish.service` / `iwm-codex-auto-publish.timer`。
- 定期実行は毎週月曜 `03:00 JST`。
- ラッパー本体は `4_code/skills/iwm-sadatakahp-ops/scripts/run_codex_auto_publish.sh`。
- ログは `5_output/logs/codex-auto-publish-YYYYMMDD-HHMMSS.log` と `journalctl --user -u iwm-codex-auto-publish.service` の両方で追える。
- 結果 JSON schema は `4_code/skills/iwm-sadatakahp-ops/scripts/codex_publish_result.schema.json`。Codex CLI の都合で nullable 項目も `required` に含める。
- 2026-03-28 の確認で、手動起動 `systemctl --user start iwm-codex-auto-publish.service` は成功し、本番反映と `git push` まで完了した。
