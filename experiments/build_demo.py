import json,csv,random,hashlib,collections,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
groups={
'Card issues':['card_arrival','card_delivery_estimate','card_not_working','contactless_not_working','card_swallowed','virtual_card_not_working','card_about_to_expire'],
'Card management':['card_linking','getting_virtual_card','get_physical_card','visa_or_mastercard','disposable_card_limits','getting_spare_card','order_physical_card','get_disposable_virtual_card','activate_my_card','change_pin','apple_pay_or_google_pay'],
'Transfers':['cancel_transfer','transfer_not_received_by_recipient','declined_transfer','pending_transfer','transfer_timing','beneficiary_not_allowed','receiving_money','failed_transfer','transfer_into_account','balance_not_updated_after_bank_transfer'],
'Cash withdrawals':['pending_cash_withdrawal','wrong_amount_of_cash_received','atm_support','declined_cash_withdrawal'],
'Account access':['pin_blocked','passcode_forgotten'],
'Identity verification':['why_verify_identity','unable_to_verify_identity','verify_source_of_funds','verify_my_identity'],
'Refunds':['request_refund','Refund_not_showing_up'],
'Payments':['card_acceptance','pending_card_payment','declined_card_payment','transaction_charged_twice','reverted_card_payment?'],
'Fees & exchange':['exchange_rate','card_payment_wrong_exchange_rate','extra_charge_on_statement','exchange_via_app','top_up_by_bank_transfer_charge','card_payment_fee_charged','transfer_fee_charged','wrong_exchange_rate_for_cash_withdrawal','exchange_charge','top_up_by_card_charge','cash_withdrawal_charge'],
'Account administration':['fiat_currency_support','age_limit','edit_personal_details','terminate_account','country_support'],
'Top-ups':['automatic_top_up','pending_top_up','top_up_limits','supported_cards_and_currencies','top_up_reverted','balance_not_updated_after_cheque_or_cash_deposit','topping_up_by_card','verify_top_up','top_up_by_cash_or_cheque','top_up_failed'],
'Security & fraud':['lost_or_stolen_card','card_payment_not_recognised','compromised_card','direct_debit_payment_not_recognised','lost_or_stolen_phone','cash_withdrawal_not_recognised']}
labels=json.loads((root/'data/categories.json').read_text())
assert sorted(sum(groups.values(),[]))==sorted(labels)
(root/'data/taxonomy.json').write_text(json.dumps(groups,indent=2)+'\n')
rows=list(csv.DictReader((root/'data/banking77-test.csv').open()))
rng=random.Random(71); by=collections.defaultdict(list)
for i,row in enumerate(rows): by[row['category']].append((i,row))
selected=[pair for label in labels for pair in rng.sample(by[label],2)]
rng.shuffle(selected)
lookup={l:g for g,ls in groups.items() for l in ls}
cases=[]
for n,(i,row) in enumerate(selected):
 truth=row['category']; family=lookup[truth]
 conf=round(rng.uniform(.78,.999) if rng.random()<.78 else rng.uniform(.32,.779),3)
 # Fixture outcomes illustrate confident failures and imperfect escalation. They are not model evaluations.
 wrong=rng.random() > (conf*.82+.12)
 pred=rng.choice([l for l in labels if lookup[l]!=family]) if wrong else truth
 llwrong=rng.random()<.07
 llpred=rng.choice([l for l in labels if lookup[l]!=family]) if llwrong else truth
 def prediction(label,confidence,model,latency):
  top=(confidence*(len(labels)-1)+1)/len(labels)
  probs={l:round(top if l==label else (1-top)/(len(labels)-1),8) for l in labels}
  return dict(label=label,confidence=confidence,probabilities=probs,latencyMs=latency,model=model)
 cases.append(dict(id=f'banking77-test-{i:04d}',text=row['text'],truth=truth,security=family=='Security & fraud',securityProbability=round(rng.uniform(.86,.99) if family=='Security & fraud' else rng.uniform(.01,.25),3),urgency=3 if family=='Security & fraud' else 1,sufficiency=conf*3,jev=prediction(pred,conf,'illustrative-jev',rng.randint(45,160)),llm=prediction(llpred,round(rng.uniform(.65,.84) if rng.random()<.12 else rng.uniform(.86,.995),3),'illustrative-reference',rng.randint(800,3200))))
run=dict(schemaVersion=1,kind='simulation',id='banking77-illustration-v1',timestamp=None,dataset='BANKING77 · official test split (154-case illustration)',datasetRevision='9d081458ff52e53cf7e848f414e6e9344e4e6696',datasetSha256=hashlib.sha256((root/'data/banking77-test.csv').read_bytes()).hexdigest(),promptVersion='routing-v1',models=dict(jev='Illustrative Jev outputs',llm='Illustrative reference outputs'),cases=cases,notes=['Real BANKING77 queries; all model predictions, confidence values, and latencies are deterministic illustrative fixtures, not API measurements.','The illustration selects two test queries per intent using seed 71. It must not be cited as model performance.','All dollar amounts use editable hypothetical unit costs. Human review is simulated with benchmark ground truth.'])
(root/'public/demo.json').write_text(json.dumps(run,separators=(',',':'))+'\n')
print(f'{len(rows)} official test rows; {len(labels)} intents; {len(groups)} families; {len(cases)} demonstration fixtures')
