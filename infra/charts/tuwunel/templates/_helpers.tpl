{{- define "tuwunel.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tuwunel.fullname" -}}
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

{{- define "tuwunel.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tuwunel.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "tuwunel.labels" -}}
{{ include "tuwunel.selectorLabels" . }}
app.kubernetes.io/version: {{ include "tuwunel.tag" . | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "tuwunel.tag" -}}
{{- default .Chart.AppVersion .Values.image.tag -}}
{{- end -}}

{{- define "tuwunel.hostname" -}}
{{- required "hostname is required, e.g. matrix.example.org" .Values.hostname -}}
{{- end -}}

{{- define "tuwunel.wellKnownClient" -}}
{{- default (printf "https://%s" (include "tuwunel.hostname" .)) .Values.wellKnown.client -}}
{{- end -}}

{{- define "tuwunel.secretsDir" -}}/run/secrets/tuwunel{{- end -}}
