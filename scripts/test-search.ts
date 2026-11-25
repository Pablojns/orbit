import assert from "node:assert/strict";
import { matchesSearch } from "../src/lib/search-synonyms";

const hay = (d: string, c: string) => `${d} ${c}`;
assert.ok(matchesSearch(hay("iFood", "Alimentação"), "comida"));
assert.ok(matchesSearch(hay("Compra do mês", "Mercado"), "comida"));
assert.ok(matchesSearch(hay("Restaurante Sabor", "Lazer"), "comida"));
assert.ok(matchesSearch(hay("Uber", "Outros"), "transporte"));
assert.ok(matchesSearch(hay("99", ""), "transporte"));
assert.ok(matchesSearch(hay("Gasolina", "Carro"), "transporte"));
assert.ok(!matchesSearch(hay("Netflix", "Lazer"), "transporte"));
assert.ok(!matchesSearch(hay("R$ 199", "Lazer"), "transporte"), "99 dentro de 199 não conta");
assert.ok(matchesSearch(hay("iFood", "Alimentação"), "ifood"));
assert.ok(matchesSearch(hay("Farmácia São João", "Saúde"), "remedio"));
assert.ok(matchesSearch(hay("iFood pix", "Alimentação"), "comida pix"));
assert.ok(!matchesSearch(hay("Uber", "Transporte"), "comida"));
assert.ok(matchesSearch(hay("Salário", "Salário"), "salario"));
assert.ok(matchesSearch(hay("Aluguel", "Casa"), "moradia"));
console.log("test-search: ok");
