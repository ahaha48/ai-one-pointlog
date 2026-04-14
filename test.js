const url = "https://script.google.com/macros/s/AKfycbweu6-xom1CkE4x649544uGRzjAEBq8v0rBUIyiO_5TNcbX6ZwZm-UtvQLVGFHcvhJG/exec";
const payload = {
  userName: "NodeFetchTest",
  category: "test",
  usedAI: "test",
  details: "Testing node fetch"
};
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({ payload: JSON.stringify(payload) })
}).then(res => res.text()).then(console.log).catch(console.error);
