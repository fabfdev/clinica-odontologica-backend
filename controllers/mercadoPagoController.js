const { MercadoPagoConfig, PreApproval, Payment, PaymentMethod } = require('mercadopago');
const crypto = require('crypto');
const admin = require('../config/firebase');

// Configure Mercado Pago SDK
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preApproval = new PreApproval(client);
const payment = new Payment(client);
const paymentMethod = new PaymentMethod(client);

class MercadoPagoController {
  // Criar assinatura recorrente
  static async createSubscription(req, res) {
    const { clinicId, plan, email } = req.body;

    try {
      // Validar dados de entrada
      if (!clinicId || !plan || !email) {
        return res.status(400).json({ 
          error: 'Missing required fields: clinicId, plan, email' 
        });
      }

      // Configurar data de fim (2 anos no futuro)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2);

      // Definir valores baseados no plano
      const planConfig = plan === 'monthly' 
        ? {
            amount: 49.90,
            frequency: 1,
            frequency_type: 'months'
          }
        : {
            amount: 499.00,
            frequency: 1,
            frequency_type: 'years'
          };

      const preapprovalData = {
        reason: `Assinatura Premium Clínica - Plano ${plan}`,
        external_reference: `clinic-${clinicId}-${plan}-${Date.now()}`,
        payer_email: email,
        auto_recurring: {
          frequency: planConfig.frequency,
          frequency_type: planConfig.frequency_type,
          end_date: endDate.toISOString(),
          transaction_amount: planConfig.amount,
          currency_id: 'BRL'
        },
        back_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/premium/success`,
        status: 'pending'
      };

      console.log('📋 Criando assinatura MP:', preapprovalData);

      const response = await preApproval.create({ body: preapprovalData });

      console.log('✅ Assinatura criada:', response.id);
      
      // Salvar o mpSubscriptionId imediatamente na clínica
      try {
        const db = admin.firestore();
        const clinicRef = db.collection('clinics').doc(clinicId);
        
        await clinicRef.update({
          mpSubscriptionId: response.id,
          'subscription.status': 'pending', // Marcar como pendente até o pagamento ser processado
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ mpSubscriptionId ${response.id} salvo para clínica ${clinicId}`);
      } catch (updateError) {
        console.error('❌ Erro ao salvar mpSubscriptionId:', updateError);
        // Não falhar a criação da assinatura por causa disso
      }

      res.json({ 
        subscriptionId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point
      });
    } catch (error) {
      console.error('❌ Erro Mercado Pago:', error);
      
      // Log mais detalhado do erro
      if (error.response) {
        console.error('MP API Response Error:', error.response.data);
      }
      
      res.status(500).json({ 
        error: 'Failed to create subscription',
        details: error.message,
        mpError: error.response?.data || null
      });
    }
  }

  // Obter status da assinatura
  static async getSubscriptionStatus(req, res) {
    const { clinicId } = req.params;
    
    try {
      const db = admin.firestore();
      const clinicRef = db.collection('clinics').doc(clinicId);
      const clinicDoc = await clinicRef.get();
      
      if (!clinicDoc.exists) {
        return res.status(404).json({ 
          error: 'Clinic not found' 
        });
      }
      
      const clinicData = clinicDoc.data();
      const subscription = clinicData.subscription || {};
      
      // Verificar se a assinatura ainda está válida
      const now = new Date();
      const expiresAt = subscription.expiresAt?.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt || 0);
      const isExpired = expiresAt < now;
      
      const subscriptionData = {
        premiumStatus: subscription.status === 'active' && !isExpired ? 'premium' : 'free',
        subscriptionStatus: isExpired ? 'expired' : (subscription.status || 'inactive'),
        currentPeriodEnd: expiresAt.toISOString(),
        mpSubscriptionId: clinicData.mpSubscriptionId || null,
        subscriptionId: clinicData.mpSubscriptionId || null, // manter compatibilidade
        plan: subscription.plan || null
      };

      res.json(subscriptionData);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({ 
        error: 'Failed to fetch subscription status',
        details: error.message 
      });
    }
  }

  // Cancelar assinatura
  static async cancelSubscription(req, res) {
    const { subscriptionId } = req.body;

    try {
      if (!subscriptionId) {
        return res.status(400).json({ 
          error: 'Missing required field: subscriptionId' 
        });
      }

      // Cancelar assinatura no Mercado Pago usando PUT
      const response = await preApproval.update({
        id: subscriptionId,
        body: {
          status: 'cancelled'
        }
      });

      // Encontrar a clínica associada e atualizar status
      const db = admin.firestore();
      const clinicsQuery = await db.collection('clinics')
        .where('mpSubscriptionId', '==', subscriptionId)
        .get();
      
      if (!clinicsQuery.empty) {
        const clinicDoc = clinicsQuery.docs[0];
        const clinicData = clinicDoc.data();
        
        // Marcar como cancelada mas manter ativa até o fim do período
        await clinicDoc.ref.update({
          'subscription.status': 'cancelled',
          'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
          'subscription.willExpireAt': clinicData.subscription.expiresAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('🗑️ Assinatura cancelada - mantendo acesso até:', clinicData.subscription.expiresAt);
      }

      res.json({
        success: true,
        message: 'Subscription cancelled successfully. Access will remain until the end of the billing period.',
        cancelledSubscriptionId: subscriptionId
      });
    } catch (error) {
      console.error('❌ Erro ao cancelar assinatura:', error);
      
      // Log detalhado do erro
      if (error.response) {
        console.error('MP API Response Error:', error.response.data);
      }
      
      res.status(500).json({ 
        error: 'Failed to cancel subscription',
        details: error.message,
        mpError: error.response?.data || null
      });
    }
  }

  // Pausar assinatura
  static async pauseSubscription(req, res) {
    const { subscriptionId } = req.body;

    try {
      if (!subscriptionId) {
        return res.status(400).json({ 
          error: 'Missing required field: subscriptionId' 
        });
      }

      // Pausar assinatura no Mercado Pago usando PUT
      const response = await preApproval.update({
        id: subscriptionId,
        body: {
          status: 'paused'
        }
      });

      // Atualizar status no Firestore
      const db = admin.firestore();
      const clinicsQuery = await db.collection('clinics')
        .where('mpSubscriptionId', '==', subscriptionId)
        .get();
      
      if (!clinicsQuery.empty) {
        const clinicDoc = clinicsQuery.docs[0];
        
        await clinicDoc.ref.update({
          'subscription.status': 'paused',
          'subscription.pausedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('⏸️ Assinatura pausada:', subscriptionId);
      }

      res.json({
        success: true,
        message: 'Subscription paused successfully',
        pausedSubscriptionId: subscriptionId
      });
    } catch (error) {
      console.error('❌ Erro ao pausar assinatura:', error);
      
      if (error.response) {
        console.error('MP API Response Error:', error.response.data);
      }
      
      res.status(500).json({ 
        error: 'Failed to pause subscription',
        details: error.message,
        mpError: error.response?.data || null
      });
    }
  }

  // Verificar assinatura do webhook
  static verifyWebhookSignature(req) {
    if (!process.env.MP_WEBHOOK_SECRET) {
      console.log('⚠️ MP_WEBHOOK_SECRET não configurado - pulando verificação');
      return true;
    }

    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    
    if (!signature || !requestId) {
      console.log('❌ Headers de assinatura ausentes');
      return false;
    }

    const dataToSign = `id:${req.query.data_id};request-id:${requestId};ts:${req.query.ts};`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
      .update(dataToSign)
      .digest('hex');

    const receivedSignature = signature.split(',')[1]?.replace('v1=', '');

    console.log({expectedSignature, receivedSignature})
    
    const isValid = expectedSignature === receivedSignature;
    
    if (!isValid) {
      console.error('❌ Assinatura do webhook inválida');
    }
    
    return isValid;
  }

  // Webhook handler
  static async handleWebhook(req, res) {
    const payload = req.body;
    const topic = req.query.topic || req.query.type;

    console.log('🔍 Webhook Debug Info:');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    console.log('Body:', payload);
    console.log('Topic:', topic);

    try {
      // TEMPORÁRIO: Pular verificação de assinatura em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        if (!MercadoPagoController.verifyWebhookSignature(req)) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      } else {
        console.log('⚠️ Desenvolvimento: Pulando verificação de assinatura do webhook');
      }

      console.log(`📧 Webhook MP recebido: ${topic}`, payload);

      switch (topic) {
        case 'preapproval':
          await MercadoPagoController.handlePreapprovalWebhook(payload);
          break;
        
        case 'authorized_payment':
          await MercadoPagoController.handlePaymentWebhook(payload);
          break;
          
        case 'payment':
          await MercadoPagoController.handlePaymentWebhook(payload);
          break;
          
        default:
          console.log(`⚠️ Tipo de webhook não tratado: ${topic}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(400).json({ 
        error: 'Webhook handler failed',
        details: error.message 
      });
    }
  }

  // Handler para webhooks de preapproval
  static async handlePreapprovalWebhook(payload) {
    const preapprovalId = payload.data.id;
    
    try {
      // Buscar detalhes da assinatura
      const preapprovalData = await preApproval.get({ id: preapprovalId });
      const clinicId = preapprovalData.external_reference.split('-')[1]; // Extrair do external_reference

      console.log(`📝 Preapproval atualizada: ${preapprovalId} - Status: ${preapprovalData.status}`);

      // Atualizar status da clínica baseado no status da assinatura
      const updateData = {
        mpSubscriptionId: preapprovalId,
        subscription: {
          plan: 'premium',
          status: preapprovalData.status === 'authorized' ? 'active' : 'cancelled',
          expiresAt: new Date(preapprovalData.auto_recurring.end_date)
        }
      };

      console.log(`Atualizando clínica ${clinicId}:`, updateData);
      
      // Atualizar no Firestore
      await MercadoPagoController.updateClinicSubscription(clinicId, updateData);
      
    } catch (error) {
      console.error('Error handling preapproval webhook:', error);
    }
  }

  // Handler para webhooks de pagamento
  static async handlePaymentWebhook(payload) {
    const paymentId = payload.resource || payload.data?.id;
    
    try {
      // Buscar detalhes do pagamento
      const paymentData = await payment.get({ id: paymentId });
      
      console.log(`💳 Pagamento processado: ${paymentId} - Status: ${paymentData.status}`);
      console.log('Payment data:', JSON.stringify(paymentData, null, 2));

      // Extrair informações do pagamento
      const externalReference = paymentData.external_reference;
      const preapprovalId = paymentData.preapproval_id;
      
      console.log(`External reference: ${externalReference}`);
      console.log(`Preapproval ID: ${preapprovalId}`);
      
      if (paymentData.status === 'approved') {
        // Pagamento aprovado - atualizar assinatura
        await MercadoPagoController.processApprovedPayment(paymentId, paymentData, externalReference, preapprovalId);
      } else if (paymentData.status === 'rejected') {
        console.log(`❌ Pagamento rejeitado: ${paymentId}`);
        await MercadoPagoController.processRejectedPayment(paymentId, paymentData, externalReference, preapprovalId);
      } else {
        console.log(`ℹ️ Pagamento em outro status: ${paymentData.status} - ID: ${paymentId}`);
      }
      
    } catch (error) {
      console.error('Error handling payment webhook:', error);
    }
  }
  
  // Processar pagamento aprovado
  static async processApprovedPayment(paymentId, paymentData, externalReference, preapprovalId) {
    try {
      const db = admin.firestore();
      
      // Tentar extrair clinicId do external_reference ou buscar pela subscription ID
      let clinicId = null;
      
      if (externalReference && externalReference.includes('clinic-')) {
        clinicId = externalReference.split('-')[1];
        console.log(`✅ Clinic ID extraído do external_reference: ${clinicId}`);
      } else if (preapprovalId) {
        // Buscar clínica pelo subscription ID
        console.log(`🔍 Buscando clínica pelo preapproval ID: ${preapprovalId}`);
        const clinicsQuery = await db.collection('clinics')
          .where('mpSubscriptionId', '==', preapprovalId)
          .get();
          
        if (!clinicsQuery.empty) {
          clinicId = clinicsQuery.docs[0].id;
          console.log(`✅ Clinic ID encontrado pela subscription: ${clinicId}`);
        }
      }
      
      if (!clinicId) {
        console.error('❌ Não foi possível identificar a clínica do pagamento');
        return;
      }
      
      // Buscar dados da clínica
      const clinicRef = db.collection('clinics').doc(clinicId);
      const clinicDoc = await clinicRef.get();
      
      if (!clinicDoc.exists) {
        console.error(`❌ Clínica ${clinicId} não encontrada`);
        return;
      }
      
      const clinicData = clinicDoc.data();
      const currentSubscription = clinicData.subscription || {};
      
      // Determinar o tipo de plano baseado no valor
      const amount = paymentData.transaction_amount;
      const isMonthly = amount <= 50; // 49.90 para mensal
      const planType = isMonthly ? 'monthly' : 'yearly';
      
      // Calcular nova data de expiração
      let newExpirationDate;
      const now = new Date();
      const currentExpiration = currentSubscription.expiresAt?.toDate ? 
        currentSubscription.expiresAt.toDate() : null;
      
      // Se já tem assinatura ativa e não expirou, estender a partir da data atual de expiração
      const baseDate = currentExpiration && currentExpiration > now ? currentExpiration : now;
      
      if (isMonthly) {
        newExpirationDate = new Date(baseDate);
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);
      } else {
        newExpirationDate = new Date(baseDate);
        newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);
      }
      
      // Dados da transação para salvar
      const transactionData = {
        id: paymentId,
        status: paymentData.status,
        amount: amount,
        currency: paymentData.currency_id,
        paymentMethod: paymentData.payment_method_id,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        externalReference: externalReference || null,
        preapprovalId: preapprovalId || null,
        payerEmail: paymentData.payer?.email || null
      };
      
      // Atualizar dados da clínica
      const updateData = {
        subscription: {
          status: 'active',
          plan: planType,
          expiresAt: admin.firestore.Timestamp.fromDate(newExpirationDate),
          lastPaymentId: paymentId,
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          lastPaymentAmount: amount
        },
        lastTransactionData: transactionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Só adicionar mpSubscriptionId se não for undefined
      if (preapprovalId) {
        updateData.mpSubscriptionId = preapprovalId;
      }
      
      // Salvar transação separadamente na subcoleção
      await clinicRef.collection('transactions').doc(paymentId).set(transactionData);
      
      // Atualizar documento da clínica
      await clinicRef.update(updateData);
      
      console.log(`✅ Pagamento ${paymentId} processado com sucesso:`);
      console.log(`   - Clínica: ${clinicId}`);
      console.log(`   - Valor: R$ ${amount}`);
      console.log(`   - Plano: ${planType}`);
      console.log(`   - Nova expiração: ${newExpirationDate.toISOString()}`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar pagamento aprovado ${paymentId}:`, error);
    }
  }
  
  // Processar pagamento rejeitado
  static async processRejectedPayment(paymentId, paymentData, externalReference, preapprovalId) {
    try {
      const db = admin.firestore();
      
      // Buscar clínica
      let clinicId = null;
      
      if (externalReference && externalReference.includes('clinic-')) {
        clinicId = externalReference.split('-')[1];
      } else if (preapprovalId) {
        const clinicsQuery = await db.collection('clinics')
          .where('mpSubscriptionId', '==', preapprovalId)
          .get();
          
        if (!clinicsQuery.empty) {
          clinicId = clinicsQuery.docs[0].id;
        }
      }
      
      if (!clinicId) {
        console.error('❌ Não foi possível identificar a clínica do pagamento rejeitado');
        return;
      }
      
      const clinicRef = db.collection('clinics').doc(clinicId);
      
      // Salvar transação rejeitada
      const transactionData = {
        id: paymentId,
        status: paymentData.status,
        amount: paymentData.transaction_amount,
        currency: paymentData.currency_id,
        paymentMethod: paymentData.payment_method_id,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        externalReference: externalReference || null,
        preapprovalId: preapprovalId || null,
        payerEmail: paymentData.payer?.email || null,
        rejectionReason: paymentData.status_detail
      };
      
      await clinicRef.collection('transactions').doc(paymentId).set(transactionData);
      
      // Atualizar último pagamento rejeitado
      await clinicRef.update({
        lastRejectedPayment: transactionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`❌ Pagamento rejeitado ${paymentId} registrado para clínica ${clinicId}`);
      console.log(`   - Motivo: ${paymentData.status_detail}`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar pagamento rejeitado ${paymentId}:`, error);
    }
  }

  // Atualizar assinatura da clínica no Firestore
  static async updateClinicSubscription(clinicId, updateData) {
    try {
      const db = admin.firestore();
      const clinicRef = db.collection('clinics').doc(clinicId);
      
      // Verificar se a clínica existe
      const clinicDoc = await clinicRef.get();
      if (!clinicDoc.exists) {
        console.error(`❌ Clínica ${clinicId} não encontrada`);
        return;
      }
      
      // Atualizar documento da clínica
      await clinicRef.update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Clínica ${clinicId} atualizada com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar clínica ${clinicId}:`, error);
      throw error;
    }
  }

  // Obter métodos de pagamento disponíveis
  static async getPaymentMethods(req, res) {
    try {
      const paymentMethods = await paymentMethod.get();
      
      // Filtrar apenas os métodos relevantes para assinatura
      const relevantMethods = paymentMethods.filter(method => 
        ['credit_card', 'debit_card', 'pix'].includes(method.id)
      );

      res.json({ paymentMethods: relevantMethods });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ 
        error: 'Failed to fetch payment methods',
        details: error.message 
      });
    }
  }
}

module.exports = MercadoPagoController;
