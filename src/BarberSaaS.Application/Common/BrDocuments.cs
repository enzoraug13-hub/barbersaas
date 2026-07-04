namespace BarberSaaS.Application.Common;

/// <summary>
/// Validação matemática de CPF/CNPJ (dígitos verificadores). Não consulta a Receita —
/// a checagem online do CNPJ fica em <see cref="Interfaces.ICnpjLookupService"/>.
/// </summary>
public static class BrDocuments
{
    /// <summary>Remove tudo que não é dígito.</summary>
    public static string OnlyDigits(string value) =>
        new(value.Where(char.IsDigit).ToArray());

    public static bool IsValidCpf(string cpf)
    {
        var d = OnlyDigits(cpf);
        if (d.Length != 11) return false;
        if (d.Distinct().Count() == 1) return false; // 000..., 111... etc.

        int CalcDigit(int length)
        {
            var sum = 0;
            for (var i = 0; i < length; i++) sum += (d[i] - '0') * (length + 1 - i);
            var rest = (sum * 10) % 11;
            return rest == 10 ? 0 : rest;
        }

        return CalcDigit(9) == d[9] - '0' && CalcDigit(10) == d[10] - '0';
    }

    public static bool IsValidCnpj(string cnpj)
    {
        var d = OnlyDigits(cnpj);
        if (d.Length != 14) return false;
        if (d.Distinct().Count() == 1) return false;

        int CalcDigit(int length)
        {
            // Pesos oficiais: começam em 5 (1º dígito) ou 6 (2º) e decrescem até 2, reiniciando em 9.
            var weight = length - 7;
            var sum = 0;
            for (var i = 0; i < length; i++)
            {
                sum += (d[i] - '0') * weight;
                weight = weight == 2 ? 9 : weight - 1;
            }
            var rest = sum % 11;
            return rest < 2 ? 0 : 11 - rest;
        }

        return CalcDigit(12) == d[12] - '0' && CalcDigit(13) == d[13] - '0';
    }
}
