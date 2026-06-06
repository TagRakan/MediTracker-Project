package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.Role;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import java.time.LocalDate;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

//TODO add a good bit of data safety and checks

@Entity
@Table(name = "users")
@NoArgsConstructor
@Setter
@Getter
public class User {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;

    @Email
    @Size(max = 40)
    @NotBlank
    private String username;

    @JsonIgnore
    @NotBlank
    @Size(max = 120)
    private String password;

    @JsonProperty("dateOfBirth")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    @NotBlank
    private String name;

    //code variables for adding to patients/family
    @JsonIgnore
    @Size(max = 6)
    private String familyCode;
    @JsonIgnore
    @Size(max = 6)
    private String patientCode;
    @JsonIgnore
    private LocalDate familyCodeGeneratedAt;
    @JsonIgnore
    private LocalDate patientCodeGeneratedAt;
    // variables end


    public User(String username, String password, String name, LocalDate dateOfBirth){
        this.dateOfBirth = dateOfBirth;
        this.name=name;
        this.username=username;
        this.password=password;
    }

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(joinColumns = @JoinColumn(name = "role_id"),
    inverseJoinColumns = @JoinColumn(name = "user_id"))
    Set<Role> roles = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Ailment> ailmentList;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Log> logList;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Dose> doses;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<PastDoses> pastDoses;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<FamilyRelationships> family;

    @JsonIgnore
    @ManyToMany
    @JoinTable(name = "user_patients",
            joinColumns = @JoinColumn(name = "doctor_id"),
            inverseJoinColumns = @JoinColumn(name = "patient_id"))
    private Set<User> patients = new HashSet<>();

    @JsonIgnore
    @ManyToMany(mappedBy = "patients")
    private Set<User> doctors = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Medicine> medicine;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<InAppMessage> inAppMessages;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<AilmentType> ailmentTypes;


}
