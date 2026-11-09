# Append to the existing Caddyfile; retain CCC and WVA sites.
# Proposed hostname: configure DNS before enabling this site.
cp-mcp.consumerchoicecenter.org {
    reverse_proxy cp-brand-mcp:8083
}
