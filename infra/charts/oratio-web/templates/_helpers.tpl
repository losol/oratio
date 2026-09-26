{{- define "oratio-web.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "oratio-web.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "oratio-web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "oratio-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "oratio-web.labels" -}}
{{ include "oratio-web.selectorLabels" . }}
app.kubernetes.io/version: {{ include "oratio-web.tag" . | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- /* No fallback: CI publishes only main-<sha>, so there is no tag to default to. */ -}}
{{- define "oratio-web.tag" -}}
{{- required "image.tag is required, e.g. main-1a2b3c4 (published by oratio CI)" .Values.image.tag -}}
{{- end -}}

{{- define "oratio-web.homeserverUrl" -}}
{{- required "homeserverUrl is required, e.g. https://matrix.example.org" .Values.homeserverUrl | trimSuffix "/" -}}
{{- end -}}
