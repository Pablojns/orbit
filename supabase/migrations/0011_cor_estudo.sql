-- Agenda (rodada 2): o tipo "Estudo" de fábrica deixa de ser verde-água, que parecia o verde de "feito".
update public.event_types set color = '#22D3EE' where color = '#5EEAD4' and name = 'Estudo';
