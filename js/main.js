document.addEventListener('DOMContentLoaded', async () => {
  // Fetch Site Content se o supabase estiver ativo e configurado
  if (window.supabaseClient && SUPABASE_URL !== 'ATUALIZA_NO_SUPABASE_PROJECT_URL') {
    try {
      const { data, error } = await window.supabaseClient.from('site_content').select('*');
      if (!error && data) {
        data.forEach(item => {
          const el = document.getElementById(item.id);
          if (el) {
            el.innerText = item.content;
          }
        });
      }
    } catch (e) {
      console.log('Sem conteúdos dinâmicos definidos na Base de Dados ainda.');
    }
  }

  // Order Form Logic
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('custName').value;
      const email = document.getElementById('custEmail').value;
      const address = document.getElementById('custAddress').value;

      document.getElementById('orderMsg').innerText = "A redirecionar para o pagamento seguro. Por favor aguarde...";
      document.getElementById('orderMsg').style.color = "orange";
      
      // Aqui integrarias com o Stripe (criar checkout session no backend)
      // Como exemplo, gravamos na base de dados "Pending" order
      if (window.supabaseClient && SUPABASE_URL !== 'ATUALIZA_NO_SUPABASE_PROJECT_URL') {
        const { error } = await window.supabaseClient.from('orders').insert([
          { customer_name: name, email: email, address: address, status: 'pending_payment' }
        ]);

        if(!error) {
          setTimeout(() => {
            document.getElementById('orderMsg').innerText = "Simulação: Sucesso! Encomenda registada.";
            document.getElementById('orderMsg').style.color = "green";
            orderForm.reset();
          }, 2000);
        } else {
          document.getElementById('orderMsg').innerText = "Erro ao registar encomenda.";
          document.getElementById('orderMsg').style.color = "red";
        }
      } else {
        setTimeout(() => {
          document.getElementById('orderMsg').innerText = "Simulação: Este formulário requer a configuração do Supabase e do Stripe para funcionar em Prod!";
          document.getElementById('orderMsg').style.color = "blue";
          orderForm.reset();
        }, 3000);
      }
    });
  }
});
