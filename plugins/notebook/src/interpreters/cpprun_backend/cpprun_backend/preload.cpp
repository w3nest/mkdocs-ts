#include <nlohmann/json.hpp>
#include <iostream>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <cstring>
#include <string>
#include <vector>
#include "cling/Interpreter/Interpreter.h"


// Type alias for convenience
using json = nlohmann::json;

enum TypeCode : uint32_t {
    TYPE_BOOL = 0,
    TYPE_INT = 1,
    TYPE_DOUBLE = 2,
    TYPE_STRING = 3,
    TYPE_VECTOR_DOUBLE = 4,
    TYPE_VECTOR_STRING = 5 ,
    TYPE_JSON = 6
};

// Shared memory header
struct Header {
    uint32_t type;   // 0=int, 1=double, 2=string, 3=vector<double>
    uint32_t count;  // number of elements
};

// Shared memory settings
const char* shm_name =  "/cling_py_shared";

// Helper: open/create shared memory
inline void* open_shm_out(int& fd, size_t shm_size) {
    fd = shm_open(shm_name, O_CREAT | O_RDWR, 0666);
    if (fd == -1) {
        perror("shm_open");
        return nullptr;
    }
    if (ftruncate(fd, shm_size) == -1) {
        perror("ftruncate");
        return nullptr;
    }
    void* ptr = mmap(nullptr, shm_size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (ptr == MAP_FAILED) {
        perror("mmap");
        close(fd);
        return nullptr;
    }
    return ptr;
}
void export_to_shm(double value) {
    size_t payload_size = sizeof(value);
    size_t size = sizeof(Header) + payload_size;

    int fd;
    void* ptr = open_shm_out(fd, size);
    if (!ptr) return;

    Header h{TypeCode::TYPE_DOUBLE, static_cast<uint32_t>(payload_size)};
    std::memcpy(ptr, &h, sizeof(h));
    std::memcpy((char*)ptr + sizeof(h), &value, payload_size);

    munmap(ptr, size);
    close(fd);
    std::cout << "export_to_shm<double> done" << std::endl;
}

// string
void export_to_shm(const std::string& str) {
    size_t payload_size = str.size();
    size_t size = sizeof(Header) + payload_size;

    int fd;
    void* ptr = open_shm_out(fd, size);
    if (!ptr) return;

    Header h{TypeCode::TYPE_STRING, static_cast<uint32_t>(payload_size)};
    std::memcpy(ptr, &h, sizeof(h));
    std::memcpy((char*)ptr + sizeof(h), str.data(), payload_size);

    munmap(ptr, size);
    close(fd);
    std::cout << "export_to_shm<string> done" << std::endl;
}

// vector<double>
void export_to_shm(const std::vector<double>& vec) {
    size_t payload_size = vec.size() * sizeof(double);
    size_t size = sizeof(Header) + payload_size;

    int fd;
    void* ptr = open_shm_out(fd, size);
    if (!ptr) return;

    Header h{TypeCode::TYPE_VECTOR_DOUBLE, static_cast<uint32_t>(payload_size)};
    std::memcpy(ptr, &h, sizeof(h));
    std::memcpy((char*)ptr + sizeof(h), vec.data(), payload_size);

    munmap(ptr, size);
    close(fd);
    std::cout << "export_to_shm<vector<double>> done" << std::endl;
}

// vector<string>
void export_to_shm(const std::vector<std::string>& vec) {
    uint32_t payload_size = 0;
    for (const auto& s : vec) {
        payload_size += sizeof(uint32_t); // length prefix
        payload_size += static_cast<uint32_t>(s.size());
    }
    size_t size = sizeof(Header) + payload_size;

    int fd;
    void* ptr = open_shm_out(fd, size);
    if (!ptr) return;

    Header h{TypeCode::TYPE_VECTOR_STRING, payload_size};
    std::memcpy(ptr, &h, sizeof(h));

    char* p = static_cast<char*>(ptr) + sizeof(h);
    for (const auto& s : vec) {
        uint32_t len = static_cast<uint32_t>(s.size());
        std::memcpy(p, &len, sizeof(len));
        p += sizeof(len);
        std::memcpy(p, s.data(), len);
        p += len;
    }

    munmap(ptr, size);
    close(fd);
    std::cout << "export_to_shm<vector<string>> done" << std::endl;
}

// json
void export_to_shm(const std::unique_ptr<nlohmann::json>& j) {
    std::string s = j->dump();
    size_t payload_size = s.size();
    size_t size = sizeof(Header) + payload_size;

    int fd;
    void* ptr = open_shm_out(fd, size);
    if (!ptr) return;

    Header h{TypeCode::TYPE_JSON, static_cast<uint32_t>(payload_size)};
    std::memcpy(ptr, &h, sizeof(h));
    std::memcpy((char*)ptr + sizeof(h), s.data(), payload_size);

    munmap(ptr, size);
    close(fd);
    std::cout << "export_to_shm<json> done" << std::endl;
}

inline void* open_shm_in(int& fd) {

    fd = shm_open(shm_name, O_RDONLY, 0666);
    if (fd < 0) {
        perror("shm_open failed");
        return nullptr;
    }
    struct stat st;
    if (fstat(fd, &st) < 0) {
        perror("fstat failed");
        close(fd);
        return nullptr;
    }

    void* ptr = mmap(nullptr, st.st_size, PROT_READ, MAP_SHARED, fd, 0);
    if (ptr == MAP_FAILED) {
        perror("mmap failed");
        close(fd);
        return nullptr;
    }

    return ptr;
}


inline void close_and_unlink(void* shm_ptr, int fd) {
    struct stat st;
    if (fstat(fd, &st) < 0) {
        perror("fstat failed");
        close(fd);
    }

    munmap(shm_ptr, st.st_size);
    close(fd);
    shm_unlink(shm_name);
}

// Fixed-size types: int, double, bool
template <typename T>
void read_fixed_from_shm(T& out, uint32_t expected_type) {
    static_assert(std::is_arithmetic_v<T> || std::is_same_v<T,bool>, "Only arithmetic/bool supported");

    int fd;
    void* shm_ptr = open_shm_in(fd);
    if (!shm_ptr) throw std::runtime_error("Failed to open SHM");
    char* p = static_cast<char*>(shm_ptr);

    Header h;
    std::memcpy(&h, p, sizeof(Header));
    if (h.type != expected_type) {
        close_and_unlink(shm_ptr, fd);
        throw std::runtime_error("Type mismatch in SHM");
    }

    p += sizeof(Header);
    std::memcpy(&out, p, sizeof(T));

    close_and_unlink(shm_ptr, fd);
}

// Fixed-size vector types
template <typename T>
void read_vector_fixed_from_shm(std::vector<T>& out, uint32_t expected_type) {
    static_assert(std::is_arithmetic_v<T> || std::is_same_v<T,bool>, "Only arithmetic/bool supported");

    int fd;
    void* shm_ptr = open_shm_in(fd);
    if (!shm_ptr) throw std::runtime_error("Failed to open SHM");
    char* p = static_cast<char*>(shm_ptr);

    Header h;
    std::memcpy(&h, p, sizeof(Header));
    if (h.type != expected_type) {
        close_and_unlink(shm_ptr, fd);
        throw std::runtime_error("Type mismatch in SHM");
    }

    p += sizeof(Header);
    size_t n = h.count / sizeof(T);
    out.resize(n);
    std::memcpy(out.data(), p, h.count);

    close_and_unlink(shm_ptr, fd);
}

// Variable-size vector<string>
void read_vector_string_from_shm(std::vector<std::string>& out, uint32_t expected_type) {
    int fd;
    void* shm_ptr = open_shm_in(fd);
    if (!shm_ptr) throw std::runtime_error("Failed to open SHM");
    char* p = static_cast<char*>(shm_ptr);

    Header h;
    std::memcpy(&h, p, sizeof(Header));
    if (h.type != expected_type) {
        close_and_unlink(shm_ptr, fd);
        throw std::runtime_error("Type mismatch in SHM");
    }

    p += sizeof(Header);
    size_t offset = 0;
    out.clear();
    while (offset < h.count) {
        uint32_t len;
        std::memcpy(&len, p + offset, sizeof(uint32_t));
        offset += sizeof(uint32_t);
        out.emplace_back(p + offset, len);
        offset += len;
    }

    close_and_unlink(shm_ptr, fd);
}

// Overloads for convenience
inline void read_from_shm(int& x) { read_fixed_from_shm(x, TypeCode::TYPE_INT); }
inline void read_from_shm(double& x) { read_fixed_from_shm(x, TypeCode::TYPE_DOUBLE); }
inline void read_from_shm(bool& x) { read_fixed_from_shm(x, TypeCode::TYPE_BOOL); }
inline void read_from_shm(std::vector<double>& v) { read_vector_fixed_from_shm(v, TypeCode::TYPE_VECTOR_DOUBLE); }
// inline void read_from_shm(std::vector<bool>& v) { read_vector_fixed_from_shm(v, TypeCode::TYPE_VECTOR_BOOL); }
inline void read_from_shm(std::string& s) { 
    int fd; void* shm_ptr = open_shm_in(fd);
    if(!shm_ptr) throw std::runtime_error("Failed to open SHM");
    char* p = static_cast<char*>(shm_ptr);
    Header h; std::memcpy(&h,p,sizeof(Header));
    if(h.type!=TypeCode::TYPE_STRING){close_and_unlink(shm_ptr,fd);throw std::runtime_error("Type mismatch");}
    p += sizeof(Header); s.assign(p,h.count);
    close_and_unlink(shm_ptr,fd);
}
inline void read_from_shm(std::vector<std::string>& v) { read_vector_string_from_shm(v, TypeCode::TYPE_VECTOR_STRING); }



nlohmann::json json_from_string(const std::string& s) {
    return nlohmann::json::parse(s);
}
