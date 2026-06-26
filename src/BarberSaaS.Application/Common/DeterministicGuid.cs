using System.Security.Cryptography;
using System.Text;

namespace BarberSaaS.Application.Common;

/// <summary>
/// Gera o mesmo Guid sempre para a mesma seed — usado pro "sub" do JWT de
/// cliente novo (telefone validado por OTP, ainda sem Client no banco): o
/// Id precisa ser estável entre tentativas (fechar o app no meio do cadastro
/// e voltar depois com o mesmo telefone tem que cair no mesmo Id), mas só
/// fica gravado no banco quando o nome é preenchido (UpdateMyProfileCommand).
/// </summary>
public static class DeterministicGuid
{
    public static Guid From(string seed)
    {
        var hash = MD5.HashData(Encoding.UTF8.GetBytes(seed));
        return new Guid(hash);
    }

    public static Guid ForClientPhone(Guid tenantId, string phone) => From($"client-otp:{tenantId}:{phone}");
}
