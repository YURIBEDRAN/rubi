# saidas-piloto
Modelo claude-sonnet-5, 1 repetições, 2026-10-21. X = corte desligado, Y = corte ligado.

| Tarefa | acertos X | acertos Y | custo X | custo Y | turnos X | turnos Y | cortes Y |
|---|---|---|---|---|---|---|---|
| maiores | 1/1 | 1/1 | $0.127 | $0.123 (−3%) | 2 | 2 | 1 |
| grep-meio | 1/1 | 1/1 | $0.132 | $0.153 (+16%) | 4 | 5 | 1 |
| ls-files | 1/1 | 1/1 | $0.112 | $0.112 (+0%) | 2 | 2 | 0 |
| build-log | 1/1 | 1/1 | $0.129 | $0.154 (+20%) | 3 | 5 | 1 |
| **Total** | 4/4 | 4/4 | $0.500 | $0.542 (+8%) | 11 | 14 | 3 |
