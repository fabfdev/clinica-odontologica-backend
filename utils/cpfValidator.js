function isValidCPF(cpf) {
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  let firstDigit = remainder === 10 ? 0 : remainder;
  
  // Verifica o primeiro dígito
  if (firstDigit !== parseInt(cleaned.charAt(9))) {
    return false;
  }
  
  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  let secondDigit = remainder === 10 ? 0 : remainder;
  
  // Verifica o segundo dígito
  return secondDigit === parseInt(cleaned.charAt(10));
}

function cleanCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

function formatCPF(cpf) {
  // Remove todos os caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  
  // Aplica a máscara XXX.XXX.XXX-XX
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
  
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
  }
  
  return cpf;
}

module.exports = {
  isValidCPF,
  cleanCPF,
  formatCPF
};
