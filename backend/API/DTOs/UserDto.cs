using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class UserDto
    {
        public string Email { set; get; }
        public string Token { set; get; }
        public string RefreshToken { get; set; }
    }

    public class RefreshRequest
    {
        public string RefreshToken { get; set; }
    }
}